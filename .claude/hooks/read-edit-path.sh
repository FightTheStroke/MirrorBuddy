#!/usr/bin/env bash
set -euo pipefail

# Raw patches stay single-target until every target can be checked independently.
jq -er '
  (.tool_input // .toolArgs // {path: .tool_response.filePath}) |
  if type == "string" then
    [split("\n")[] |
      select(test("^\\*\\*\\* (Update File|Add File|Delete File|Move to): ")) |
      sub("^\\*\\*\\* (Update File|Add File|Delete File|Move to): "; "")] |
    if length == 1 then .[0]
    else error("Edit control requires one target per patch") end
  elif type == "object" then .file_path // .path // ""
  else error("Edit control received invalid arguments") end
'
