/**
 * ESLint Rule: no-prisma-race-condition
 * ADR 0105: Detect find-then-create patterns that cause P2002 race conditions.
 *
 * Warns when prisma.model.create() is used inside an if-block that checks
 * the result of prisma.model.find* on the same model.
 *
 * Safe alternatives: upsert(), or create() with P2002 catch.
 */

const noPrismaRaceCondition = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Warn on Prisma find-then-create patterns (race condition risk, ADR 0105)",
    },
    messages: {
      raceCondition:
        "Prisma race condition: '{{model}}.create()' after '{{model}}.find*()' " +
        "can fail with P2002 under concurrency. Use upsert() or catch P2002. " +
        "See ADR 0105.",
    },
    schema: [],
  },

  create(context) {
    // Track find* calls per function scope: Map<model, node>
    const scopeStack = [];

    function enterScope() {
      scopeStack.push(new Map());
    }

    function exitScope() {
      scopeStack.pop();
    }

    function currentScope() {
      return scopeStack.length > 0
        ? scopeStack[scopeStack.length - 1]
        : null;
    }

    /**
     * Extract model name from a prisma member expression chain.
     * e.g. prisma.trialSession.findFirst -> "trialSession"
     */
    function getPrismaModel(node) {
      if (
        node.type === "MemberExpression" &&
        node.object?.type === "MemberExpression" &&
        node.object.object?.type === "Identifier" &&
        node.object.object.name === "prisma" &&
        node.object.property?.type === "Identifier"
      ) {
        return node.object.property.name;
      }
      // Handle tx.model.method pattern (transactions)
      if (
        node.type === "MemberExpression" &&
        node.object?.type === "MemberExpression" &&
        node.object.object?.type === "Identifier" &&
        node.object.object.name === "tx" &&
        node.object.property?.type === "Identifier"
      ) {
        return node.object.property.name;
      }
      return null;
    }

    function getMethodName(node) {
      if (
        node.type === "MemberExpression" &&
        node.property?.type === "Identifier"
      ) {
        return node.property.name;
      }
      return null;
    }

    return {
      FunctionDeclaration: enterScope,
      "FunctionDeclaration:exit": exitScope,
      FunctionExpression: enterScope,
      "FunctionExpression:exit": exitScope,
      ArrowFunctionExpression: enterScope,
      "ArrowFunctionExpression:exit": exitScope,

      CallExpression(node) {
        const callee = node.callee;
        const model = getPrismaModel(callee);
        if (!model) return;

        const method = getMethodName(callee);
        if (!method) return;

        const scope = currentScope();
        if (!scope) return;

        // Track find* calls
        if (
          method.startsWith("find") ||
          method === "count" ||
          method === "aggregate"
        ) {
          scope.set(model, node);
          return;
        }

        // Check create calls against tracked finds
        if (method === "create" && scope.has(model)) {
          // Check if we're inside an if-block (common pattern)
          let parent = node.parent;
          let inIfBlock = false;
          while (parent) {
            if (parent.type === "IfStatement") {
              inIfBlock = true;
              break;
            }
            // Also check for try-catch (P2002 handling = OK)
            if (parent.type === "TryStatement") {
              return; // Has error handling, skip warning
            }
            parent = parent.parent;
          }

          if (inIfBlock) {
            context.report({
              node,
              messageId: "raceCondition",
              data: { model },
            });
          }
        }
      },
    };
  },
};

export default noPrismaRaceCondition;
