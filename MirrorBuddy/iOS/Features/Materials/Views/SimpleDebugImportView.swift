import SwiftUI
import SwiftData

/// ULTRA-SIMPLE DEBUG IMPORT VIEW
/// Shows EXACTLY what is happening step-by-step
struct SimpleDebugImportView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var logs: [String] = []
    @State private var isWorking = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Big obvious button
                Button {
                    testCreateMaterial()
                } label: {
                    Text("TEST: Crea Materiale di Prova")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .cornerRadius(12)
                }
                .disabled(isWorking)

                Button {
                    testListMaterials()
                } label: {
                    Text("TEST: Mostra Materiali Esistenti")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }

                Button {
                    testProcessMaterial()
                } label: {
                    Text("TEST: Processa Primo Materiale")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.orange)
                        .cornerRadius(12)
                }
                .disabled(isWorking)

                Divider()

                // Log output
                ScrollView {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(Array(logs.enumerated()), id: \.offset) { _, log in
                            Text(log)
                                .font(.system(.caption, design: .monospaced))
                                .foregroundStyle(log.hasPrefix("❌") ? .red : log.hasPrefix("✅") ? .green : .primary)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                }
                .background(Color(.systemGroupedBackground))
                .cornerRadius(12)
            }
            .padding()
            .navigationTitle("Debug Import")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Chiudi") { dismiss() }
                }

                ToolbarItem(placement: .primaryAction) {
                    Button("Pulisci Log") {
                        logs.removeAll()
                    }
                }
            }
        }
    }

    private func log(_ message: String) {
        let timestamp = Date().formatted(date: .omitted, time: .standard)
        logs.append("[\(timestamp)] \(message)")
        print("🔍 DEBUG: \(message)")
    }

    private func testCreateMaterial() {
        isWorking = true
        logs.removeAll()

        log("🚀 START: Test creazione materiale")

        _Concurrency.Task {
            do {
                // Step 1: Create material
                log("📝 Step 1: Creazione oggetto Material...")
                let material = Material(
                    title: "Test Material - \(Date().formatted(date: .numeric, time: .omitted))",
                    subject: nil
                )

                log("✅ Material creato: ID=\(material.id)")
                log("   - Title: \(material.title)")
                log("   - ProcessingStatus: \(material.processingStatus)")

                // Step 2: Insert into context
                await MainActor.run {
                    log("💾 Step 2: Inserimento in modelContext...")
                    modelContext.insert(material)
                    log("✅ Material inserito nel context")
                }

                // Step 3: Save
                await MainActor.run {
                    do {
                        log("💾 Step 3: Salvataggio context...")
                        try modelContext.save()
                        log("✅ Context salvato con successo!")
                    } catch {
                        log("❌ ERRORE nel salvataggio: \(error.localizedDescription)")
                    }
                }

                // Step 4: Verify it exists
                await MainActor.run {
                    log("🔍 Step 4: Verifica materiale salvato...")
                    let descriptor = FetchDescriptor<Material>()
                    if let allMaterials = try? modelContext.fetch(descriptor) {
                        log("✅ Totale materiali nel database: \(allMaterials.count)")
                        log("   Materiali:")
                        for (index, mat) in allMaterials.enumerated() {
                            log("   \(index + 1). \(mat.title) (status: \(mat.processingStatus))")
                        }
                    } else {
                        log("❌ Non riesco a leggere i materiali dal database")
                    }
                }

                // Step 5: Check subjects
                await MainActor.run {
                    log("🔍 Step 5: Verifica materie...")
                    let descriptor = FetchDescriptor<SubjectEntity>()
                    if let subjects = try? modelContext.fetch(descriptor) {
                        log("✅ Totale materie nel database: \(subjects.count)")
                        for (index, subject) in subjects.enumerated() {
                            log("   \(index + 1). \(subject.displayName)")
                        }
                    } else {
                        log("❌ Non riesco a leggere le materie dal database")
                    }
                }

                log("✅ TEST COMPLETATO")

            } catch {
                log("❌ ERRORE GENERALE: \(error.localizedDescription)")
            }

            await MainActor.run {
                isWorking = false
            }
        }
    }

    private func testListMaterials() {
        logs.removeAll()
        log("📋 Listing tutti i materiali...")

        let descriptor = FetchDescriptor<Material>()
        if let materials = try? modelContext.fetch(descriptor) {
            log("✅ Trovati \(materials.count) materiali:")
            for (index, material) in materials.enumerated() {
                log("\(index + 1). \(material.title)")
                log("   - ID: \(material.id)")
                log("   - Status: \(material.processingStatus)")
                log("   - Subject: \(material.subject?.displayName ?? "nessuna")")
                log("   - Has PDF: \(material.pdfURL != nil ? "Sì" : "No")")
                log("   - Has Text: \(material.extractedText.isEmpty ? "No" : "Sì")")
                log("   - Has MindMap: \(material.mindMap != nil ? "Sì" : "No")")
                log("   - Flashcards: \(material.flashcards?.count ?? 0)")
            }
        } else {
            log("❌ Errore nel fetch dei materiali")
        }

        // Also check subjects
        log("\n📋 Listing tutte le materie...")
        let subjectDescriptor = FetchDescriptor<SubjectEntity>()
        if let subjects = try? modelContext.fetch(subjectDescriptor) {
            log("✅ Trovate \(subjects.count) materie:")
            for (index, subject) in subjects.enumerated() {
                log("\(index + 1). \(subject.displayName)")
            }
        } else {
            log("❌ Errore nel fetch delle materie")
        }
    }

    private func testProcessMaterial() {
        isWorking = true
        logs.removeAll()

        log("🚀 START: Test processing materiale")

        _Concurrency.Task {
            // Get first material
            let descriptor = FetchDescriptor<Material>()
            guard let materials = try? await MainActor.run(body: { try modelContext.fetch(descriptor) }),
                  let material = materials.first else {
                log("❌ Nessun materiale trovato nel database")
                await MainActor.run { isWorking = false }
                return
            }

            log("📦 Materiale selezionato: \(material.title)")
            log("   - ID: \(material.id)")
            log("   - Current Status: \(material.processingStatus)")

            // Add some dummy text if empty
            if material.extractedText.isEmpty {
                log("📝 Materiale vuoto, aggiungo testo di test...")
                await MainActor.run {
                    material.extractedText = """
                    La fotosintesi clorofilliana è il processo attraverso cui le piante verdi,
                    le alghe e alcuni batteri convertono l'energia luminosa in energia chimica.

                    Questo processo avviene nei cloroplasti e richiede:
                    - Luce solare
                    - Acqua (H2O)
                    - Anidride carbonica (CO2)

                    Il risultato è:
                    - Glucosio (C6H12O6)
                    - Ossigeno (O2)

                    La formula chimica è: 6CO2 + 6H2O + luce → C6H12O6 + 6O2
                    """
                    try? modelContext.save()
                }
                log("✅ Testo aggiunto")
            }

            // Mark as processing
            await MainActor.run {
                log("🔄 Cambio stato in 'processing'...")
                material.processingStatus = .processing
                try? modelContext.save()
                log("✅ Stato aggiornato")
            }

            // Try to process
            log("🔧 Inizio processing con MaterialProcessingPipeline...")

            do {
                let pipeline = MaterialProcessingPipeline.shared

                log("📋 Pipeline configurata:")
                log("   - Enabled steps: mindMap, flashcards")
                log("   - Priority: normal")

                try await pipeline.processMaterial(
                    material,
                    options: ProcessingOptions(
                        enabledSteps: [.mindMap, .flashcards],
                        failFast: false,
                        priority: .normal
                    ),
                    progressHandler: { progress in
                        _Concurrency.Task { @MainActor in
                            log("📊 Progress: \(progress.currentStep) - \(Int(progress.percentComplete * 100))%")
                        }
                    }
                )

                log("✅ Processing completato!")

                // Check results
                await MainActor.run {
                    log("🔍 Verifica risultati...")
                    log("   - Status: \(material.processingStatus)")
                    log("   - Has MindMap: \(material.mindMap != nil ? "Sì" : "No")")
                    log("   - Flashcards: \(material.flashcards?.count ?? 0)")

                    if let mindMap = material.mindMap {
                        log("   - MindMap nodes: \(mindMap.nodes?.count ?? 0)")
                    }
                }

            } catch {
                log("❌ ERRORE durante processing:")
                log("   \(error.localizedDescription)")
                log("   Type: \(type(of: error))")
                log("   Full error: \(String(describing: error))")

                // Mark as failed
                await MainActor.run {
                    material.processingStatus = .failed
                    try? modelContext.save()
                }
            }

            await MainActor.run {
                isWorking = false
            }

            log("✅ TEST COMPLETATO")
        }
    }
}

#Preview {
    SimpleDebugImportView()
        .modelContainer(for: [Material.self, SubjectEntity.self], inMemory: true)
}
