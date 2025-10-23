import Foundation

/// Mind map templates specialized for Italian language learning
final class ItalianMindMapTemplate {
    // MARK: - Template Generation

    /// Generate a mind map template for an Italian topic
    func generateTemplate(for topic: ItalianTopic, concept: String? = nil) -> ItalianMindMap {
        switch topic {
        case .grammar:
            return generateGrammarTemplate(concept: concept)
        case .vocabulary:
            return generateVocabularyTemplate(concept: concept)
        case .literature:
            return generateLiteratureTemplate(concept: concept)
        case .conversation:
            return generateConversationTemplate(concept: concept)
        case .writing:
            return generateWritingTemplate(concept: concept)
        case .readingComprehension:
            return generateReadingTemplate(concept: concept)
        }
    }

    // MARK: - Grammar Template

    private func generateGrammarTemplate(concept: String?) -> ItalianMindMap {
        let centralNode = ItalianMindNode(
            id: "central",
            title: concept ?? "Grammatica Italiana",
            type: .central,
            color: "#4A90E2"
        )

        let branches = [
            ItalianMindNode(
                id: "verbi",
                title: "Verbi",
                type: .mainBranch,
                color: "#E24A4A",
                children: [
                    ItalianMindNode(id: "presente", title: "Presente", type: .subBranch, color: "#E24A4A"),
                    ItalianMindNode(id: "passato", title: "Passato Prossimo", type: .subBranch, color: "#E24A4A"),
                    ItalianMindNode(id: "imperfetto", title: "Imperfetto", type: .subBranch, color: "#E24A4A"),
                    ItalianMindNode(id: "futuro", title: "Futuro", type: .subBranch, color: "#E24A4A")
                ]
            ),
            ItalianMindNode(
                id: "articoli",
                title: "Articoli",
                type: .mainBranch,
                color: "#4AE271",
                children: [
                    ItalianMindNode(id: "determinativi", title: "Determinativi: il, la, i, le", type: .subBranch, color: "#4AE271"),
                    ItalianMindNode(id: "indeterminativi", title: "Indeterminativi: un, una", type: .subBranch, color: "#4AE271")
                ]
            ),
            ItalianMindNode(
                id: "pronomi",
                title: "Pronomi",
                type: .mainBranch,
                color: "#E2B84A",
                children: [
                    ItalianMindNode(id: "soggetto", title: "Soggetto: io, tu, lui/lei", type: .subBranch, color: "#E2B84A"),
                    ItalianMindNode(id: "oggetto", title: "Oggetto diretto: mi, ti, lo/la", type: .subBranch, color: "#E2B84A"),
                    ItalianMindNode(id: "riflessivi", title: "Riflessivi: mi, ti, si", type: .subBranch, color: "#E2B84A")
                ]
            ),
            ItalianMindNode(
                id: "preposizioni",
                title: "Preposizioni",
                type: .mainBranch,
                color: "#9B4AE2",
                children: [
                    ItalianMindNode(id: "semplici", title: "Semplici: di, a, da, in, con, su", type: .subBranch, color: "#9B4AE2"),
                    ItalianMindNode(id: "articolate", title: "Articolate: del, al, dal, nel, sul", type: .subBranch, color: "#9B4AE2")
                ]
            )
        ]

        return ItalianMindMap(
            topic: .grammar,
            centralNode: centralNode,
            branches: branches,
            studyNotes: [
                "Verbi: Focus on conjugation patterns",
                "Articoli: Remember gender agreement",
                "Pronomi: Practice placement rules",
                "Preposizioni: Learn common combinations"
            ]
        )
    }

    // MARK: - Vocabulary Template

    private func generateVocabularyTemplate(concept: String?) -> ItalianMindMap {
        let centralNode = ItalianMindNode(
            id: "central",
            title: concept ?? "Vocabolario Italiano",
            type: .central,
            color: "#4A90E2"
        )

        let branches = [
            ItalianMindNode(
                id: "quotidiano",
                title: "Vita Quotidiana",
                type: .mainBranch,
                color: "#E24A4A",
                children: [
                    ItalianMindNode(id: "casa", title: "Casa: cucina, bagno, camera", type: .subBranch, color: "#E24A4A"),
                    ItalianMindNode(id: "cibo", title: "Cibo: pane, pasta, frutta", type: .subBranch, color: "#E24A4A"),
                    ItalianMindNode(id: "famiglia", title: "Famiglia: madre, padre, fratello", type: .subBranch, color: "#E24A4A")
                ]
            ),
            ItalianMindNode(
                id: "azioni",
                title: "Azioni",
                type: .mainBranch,
                color: "#4AE271",
                children: [
                    ItalianMindNode(id: "movimento", title: "Movimento: andare, venire, correre", type: .subBranch, color: "#4AE271"),
                    ItalianMindNode(id: "comunicazione", title: "Comunicazione: parlare, dire, chiedere", type: .subBranch, color: "#4AE271")
                ]
            ),
            ItalianMindNode(
                id: "descrizione",
                title: "Descrizione",
                type: .mainBranch,
                color: "#E2B84A",
                children: [
                    ItalianMindNode(id: "colori", title: "Colori: rosso, blu, verde", type: .subBranch, color: "#E2B84A"),
                    ItalianMindNode(id: "aggettivi", title: "Aggettivi: bello, grande, piccolo", type: .subBranch, color: "#E2B84A")
                ]
            )
        ]

        return ItalianMindMap(
            topic: .vocabulary,
            centralNode: centralNode,
            branches: branches,
            studyNotes: [
                "Learn words in context, not isolation",
                "Practice with example sentences",
                "Group related words together",
                "Use flashcards for daily review"
            ]
        )
    }

    // MARK: - Literature Template

    private func generateLiteratureTemplate(concept: String?) -> ItalianMindMap {
        let centralNode = ItalianMindNode(
            id: "central",
            title: concept ?? "Letteratura Italiana",
            type: .central,
            color: "#4A90E2"
        )

        let branches = [
            ItalianMindNode(
                id: "periodi",
                title: "Periodi Letterari",
                type: .mainBranch,
                color: "#E24A4A",
                children: [
                    ItalianMindNode(id: "medioevo", title: "Medioevo: Dante, Petrarca", type: .subBranch, color: "#E24A4A"),
                    ItalianMindNode(id: "rinascimento", title: "Rinascimento: Ariosto, Tasso", type: .subBranch, color: "#E24A4A"),
                    ItalianMindNode(id: "ottocento", title: "Ottocento: Manzoni, Leopardi", type: .subBranch, color: "#E24A4A"),
                    ItalianMindNode(id: "novecento", title: "Novecento: Pirandello, Calvino", type: .subBranch, color: "#E24A4A")
                ]
            ),
            ItalianMindNode(
                id: "generi",
                title: "Generi Letterari",
                type: .mainBranch,
                color: "#4AE271",
                children: [
                    ItalianMindNode(id: "poesia", title: "Poesia", type: .subBranch, color: "#4AE271"),
                    ItalianMindNode(id: "romanzo", title: "Romanzo", type: .subBranch, color: "#4AE271"),
                    ItalianMindNode(id: "teatro", title: "Teatro", type: .subBranch, color: "#4AE271")
                ]
            ),
            ItalianMindNode(
                id: "temi",
                title: "Temi Ricorrenti",
                type: .mainBranch,
                color: "#E2B84A",
                children: [
                    ItalianMindNode(id: "amore", title: "Amore", type: .subBranch, color: "#E2B84A"),
                    ItalianMindNode(id: "natura", title: "Natura", type: .subBranch, color: "#E2B84A"),
                    ItalianMindNode(id: "identita", title: "Identità", type: .subBranch, color: "#E2B84A")
                ]
            )
        ]

        return ItalianMindMap(
            topic: .literature,
            centralNode: centralNode,
            branches: branches,
            studyNotes: [
                "Connect works to historical context",
                "Compare themes across periods",
                "Analyze literary techniques",
                "Read summaries before full texts"
            ]
        )
    }

    private func generateConversationTemplate(concept: String?) -> ItalianMindMap {
        let centralNode = ItalianMindNode(
            id: "central",
            title: "Conversazione",
            type: .central,
            color: "#4A90E2"
        )

        let branches = [
            ItalianMindNode(
                id: "saluti",
                title: "Saluti",
                type: .mainBranch,
                color: "#E24A4A",
                children: [
                    ItalianMindNode(id: "formale", title: "Formale: Buongiorno, ArrivederLa", type: .subBranch, color: "#E24A4A"),
                    ItalianMindNode(id: "informale", title: "Informale: Ciao, A presto", type: .subBranch, color: "#E24A4A")
                ]
            )
        ]

        return ItalianMindMap(topic: .conversation, centralNode: centralNode, branches: branches, studyNotes: [])
    }

    private func generateWritingTemplate(concept: String?) -> ItalianMindMap {
        let centralNode = ItalianMindNode(id: "central", title: "Scrittura", type: .central, color: "#4A90E2")
        return ItalianMindMap(topic: .writing, centralNode: centralNode, branches: [], studyNotes: [])
    }

    private func generateReadingTemplate(concept: String?) -> ItalianMindMap {
        let centralNode = ItalianMindNode(id: "central", title: "Lettura", type: .central, color: "#4A90E2")
        return ItalianMindMap(topic: .readingComprehension, centralNode: centralNode, branches: [], studyNotes: [])
    }
}

// MARK: - Supporting Types

struct ItalianMindMap: Codable {
    let topic: ItalianTopic
    let centralNode: ItalianMindNode
    let branches: [ItalianMindNode]
    let studyNotes: [String]
}

struct ItalianMindNode: Codable, Identifiable {
    let id: String
    let title: String
    let type: NodeType
    let color: String
    let children: [ItalianMindNode]

    init(id: String, title: String, type: NodeType, color: String, children: [ItalianMindNode] = []) {
        self.id = id
        self.title = title
        self.type = type
        self.color = color
        self.children = children
    }

    enum NodeType: String, Codable {
        case central
        case mainBranch
        case subBranch
    }
}
