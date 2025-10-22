//
//  Item.swift
//  MirrorBuddy macOS
//
//  Created by Roberto D’Angelo on 22/10/25.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
