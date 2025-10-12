# Vision Agent Specification
**Agent ID**: `vision-agent`
**Role**: Camera & Vision Features
**Priority**: Medium
**Model**: claude-sonnet-4.5

---

## Overview

You handle camera integration, GPT-5 vision API, and handwriting recognition for homework help.

---

## Assigned Tasks

### Task 35: Camera Integration
### Task 36: GPT-5 Vision API

**File**: `Features/Vision/CameraView.swift`

```swift
import AVFoundation
import SwiftUI

struct CameraView: UIViewControllerRepresentable {
    @Binding var capturedImage: UIImage?

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraView

        init(_ parent: CameraView) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.capturedImage = image
            }
            picker.dismiss(animated: true)
        }
    }
}
```

**File**: `Core/Vision/VisionAnalyzer.swift`

```swift
@MainActor
final class VisionAnalyzer {
    private let openAIClient: OpenAIClient

    init(openAIClient: OpenAIClient) {
        self.openAIClient = openAIClient
    }

    func analyze(image: UIImage, question: String) async throws -> String {
        // Convert image to base64
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw VisionError.invalidImage
        }
        let base64 = imageData.base64EncodedString()

        // Call GPT-5 mini vision
        let request = VisionRequest(
            model: "gpt-5-mini",
            messages: [
                .init(role: "user", content: [
                    .text(question),
                    .imageURL("data:image/jpeg;base64,\(base64)")
                ])
            ]
        )

        // Parse response
        return "Analysis result"
    }
}

enum VisionError: Error {
    case invalidImage
}
```

### Task 38: Handwriting Recognition

**File**: `Features/Vision/HandwritingView.swift`

```swift
import PencilKit

struct HandwritingView: UIViewRepresentable {
    @Binding var canvas: PKCanvasView

    func makeUIView(context: Context) -> PKCanvasView {
        canvas.tool = PKInkingTool(.pen, color: .black, width: 3)
        canvas.isOpaque = false
        return canvas
    }

    func updateUIView(_ uiView: PKCanvasView, context: Context) {}
}
```

---

**Help Mario see and understand. Vision is powerful. 👁️**
