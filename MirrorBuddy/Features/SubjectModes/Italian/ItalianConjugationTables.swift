import Foundation

/// Comprehensive Italian verb conjugation system covering all tenses and moods
final class ItalianConjugationTables {

    // MARK: - Conjugation Retrieval

    /// Get full conjugation table for a verb
    func getConjugation(verb: String) -> VerbConjugation? {
        // Check if it's a common irregular verb
        if let irregular = irregularVerbs[verb.lowercased()] {
            return irregular
        }

        // Determine verb type and conjugate regularly
        if verb.hasSuffix("are") {
            return conjugateRegularARE(verb)
        } else if verb.hasSuffix("ere") {
            return conjugateRegularERE(verb)
        } else if verb.hasSuffix("ire") {
            return conjugateRegularIRE(verb)
        }

        return nil
    }

    /// Get conjugation for a specific tense
    func getConjugationForTense(verb: String, tense: ItalianTense) -> TenseConjugation? {
        guard let fullConjugation = getConjugation(verb: verb) else { return nil }

        switch tense {
        case .presenteIndicativo:
            return fullConjugation.presenteIndicativo
        case .imperfettoIndicativo:
            return fullConjugation.imperfettoIndicativo
        case .passatoRemoto:
            return fullConjugation.passatoRemoto
        case .futuroSemplice:
            return fullConjugation.futuroSemplice
        case .condizionalePresente:
            return fullConjugation.condizionalePresente
        case .presenteCongiuntivo:
            return fullConjugation.presenteCongiuntivo
        case .imperfettoCongiuntivo:
            return fullConjugation.imperfettoCongiuntivo
        case .imperativo:
            return fullConjugation.imperativo
        }
    }

    // MARK: - Regular Verb Conjugation

    private func conjugateRegularARE(_ verb: String) -> VerbConjugation {
        let stem = String(verb.dropLast(3)) // Remove "are"

        return VerbConjugation(
            infinitive: verb,
            type: .are,
            presenteIndicativo: TenseConjugation(
                tense: .presenteIndicativo,
                forms: [
                    "io": stem + "o",
                    "tu": stem + "i",
                    "lui/lei": stem + "a",
                    "noi": stem + "iamo",
                    "voi": stem + "ate",
                    "loro": stem + "ano"
                ]
            ),
            imperfettoIndicativo: TenseConjugation(
                tense: .imperfettoIndicativo,
                forms: [
                    "io": stem + "avo",
                    "tu": stem + "avi",
                    "lui/lei": stem + "ava",
                    "noi": stem + "avamo",
                    "voi": stem + "avate",
                    "loro": stem + "avano"
                ]
            ),
            passatoRemoto: TenseConjugation(
                tense: .passatoRemoto,
                forms: [
                    "io": stem + "ai",
                    "tu": stem + "asti",
                    "lui/lei": stem + "ò",
                    "noi": stem + "ammo",
                    "voi": stem + "aste",
                    "loro": stem + "arono"
                ]
            ),
            futuroSemplice: TenseConjugation(
                tense: .futuroSemplice,
                forms: [
                    "io": stem + "erò",
                    "tu": stem + "erai",
                    "lui/lei": stem + "erà",
                    "noi": stem + "eremo",
                    "voi": stem + "erete",
                    "loro": stem + "eranno"
                ]
            ),
            condizionalePresente: TenseConjugation(
                tense: .condizionalePresente,
                forms: [
                    "io": stem + "erei",
                    "tu": stem + "eresti",
                    "lui/lei": stem + "erebbe",
                    "noi": stem + "eremmo",
                    "voi": stem + "ereste",
                    "loro": stem + "erebbero"
                ]
            ),
            presenteCongiuntivo: TenseConjugation(
                tense: .presenteCongiuntivo,
                forms: [
                    "io": stem + "i",
                    "tu": stem + "i",
                    "lui/lei": stem + "i",
                    "noi": stem + "iamo",
                    "voi": stem + "iate",
                    "loro": stem + "ino"
                ]
            ),
            imperfettoCongiuntivo: TenseConjugation(
                tense: .imperfettoCongiuntivo,
                forms: [
                    "io": stem + "assi",
                    "tu": stem + "assi",
                    "lui/lei": stem + "asse",
                    "noi": stem + "assimo",
                    "voi": stem + "aste",
                    "loro": stem + "assero"
                ]
            ),
            imperativo: TenseConjugation(
                tense: .imperativo,
                forms: [
                    "tu": stem + "a",
                    "lui/lei": stem + "i",
                    "noi": stem + "iamo",
                    "voi": stem + "ate",
                    "loro": stem + "ino"
                ]
            ),
            participioPassato: stem + "ato",
            gerundio: stem + "ando"
        )
    }

    private func conjugateRegularERE(_ verb: String) -> VerbConjugation {
        let stem = String(verb.dropLast(3)) // Remove "ere"

        return VerbConjugation(
            infinitive: verb,
            type: .ere,
            presenteIndicativo: TenseConjugation(
                tense: .presenteIndicativo,
                forms: [
                    "io": stem + "o",
                    "tu": stem + "i",
                    "lui/lei": stem + "e",
                    "noi": stem + "iamo",
                    "voi": stem + "ete",
                    "loro": stem + "ono"
                ]
            ),
            imperfettoIndicativo: TenseConjugation(
                tense: .imperfettoIndicativo,
                forms: [
                    "io": stem + "evo",
                    "tu": stem + "evi",
                    "lui/lei": stem + "eva",
                    "noi": stem + "evamo",
                    "voi": stem + "evate",
                    "loro": stem + "evano"
                ]
            ),
            passatoRemoto: TenseConjugation(
                tense: .passatoRemoto,
                forms: [
                    "io": stem + "ei/etti",
                    "tu": stem + "esti",
                    "lui/lei": stem + "é/ette",
                    "noi": stem + "emmo",
                    "voi": stem + "este",
                    "loro": stem + "erono/ettero"
                ]
            ),
            futuroSemplice: TenseConjugation(
                tense: .futuroSemplice,
                forms: [
                    "io": stem + "erò",
                    "tu": stem + "erai",
                    "lui/lei": stem + "erà",
                    "noi": stem + "eremo",
                    "voi": stem + "erete",
                    "loro": stem + "eranno"
                ]
            ),
            condizionalePresente: TenseConjugation(
                tense: .condizionalePresente,
                forms: [
                    "io": stem + "erei",
                    "tu": stem + "eresti",
                    "lui/lei": stem + "erebbe",
                    "noi": stem + "eremmo",
                    "voi": stem + "ereste",
                    "loro": stem + "erebbero"
                ]
            ),
            presenteCongiuntivo: TenseConjugation(
                tense: .presenteCongiuntivo,
                forms: [
                    "io": stem + "a",
                    "tu": stem + "a",
                    "lui/lei": stem + "a",
                    "noi": stem + "iamo",
                    "voi": stem + "iate",
                    "loro": stem + "ano"
                ]
            ),
            imperfettoCongiuntivo: TenseConjugation(
                tense: .imperfettoCongiuntivo,
                forms: [
                    "io": stem + "essi",
                    "tu": stem + "essi",
                    "lui/lei": stem + "esse",
                    "noi": stem + "essimo",
                    "voi": stem + "este",
                    "loro": stem + "essero"
                ]
            ),
            imperativo: TenseConjugation(
                tense: .imperativo,
                forms: [
                    "tu": stem + "i",
                    "lui/lei": stem + "a",
                    "noi": stem + "iamo",
                    "voi": stem + "ete",
                    "loro": stem + "ano"
                ]
            ),
            participioPassato: stem + "uto",
            gerundio: stem + "endo"
        )
    }

    private func conjugateRegularIRE(_ verb: String) -> VerbConjugation {
        let stem = String(verb.dropLast(3)) // Remove "ire"

        return VerbConjugation(
            infinitive: verb,
            type: .ire,
            presenteIndicativo: TenseConjugation(
                tense: .presenteIndicativo,
                forms: [
                    "io": stem + "o",
                    "tu": stem + "i",
                    "lui/lei": stem + "e",
                    "noi": stem + "iamo",
                    "voi": stem + "ite",
                    "loro": stem + "ono"
                ]
            ),
            imperfettoIndicativo: TenseConjugation(
                tense: .imperfettoIndicativo,
                forms: [
                    "io": stem + "ivo",
                    "tu": stem + "ivi",
                    "lui/lei": stem + "iva",
                    "noi": stem + "ivamo",
                    "voi": stem + "ivate",
                    "loro": stem + "ivano"
                ]
            ),
            passatoRemoto: TenseConjugation(
                tense: .passatoRemoto,
                forms: [
                    "io": stem + "ii",
                    "tu": stem + "isti",
                    "lui/lei": stem + "ì",
                    "noi": stem + "immo",
                    "voi": stem + "iste",
                    "loro": stem + "irono"
                ]
            ),
            futuroSemplice: TenseConjugation(
                tense: .futuroSemplice,
                forms: [
                    "io": stem + "irò",
                    "tu": stem + "irai",
                    "lui/lei": stem + "irà",
                    "noi": stem + "iremo",
                    "voi": stem + "irete",
                    "loro": stem + "iranno"
                ]
            ),
            condizionalePresente: TenseConjugation(
                tense: .condizionalePresente,
                forms: [
                    "io": stem + "irei",
                    "tu": stem + "iresti",
                    "lui/lei": stem + "irebbe",
                    "noi": stem + "iremmo",
                    "voi": stem + "ireste",
                    "loro": stem + "irebbero"
                ]
            ),
            presenteCongiuntivo: TenseConjugation(
                tense: .presenteCongiuntivo,
                forms: [
                    "io": stem + "a",
                    "tu": stem + "a",
                    "lui/lei": stem + "a",
                    "noi": stem + "iamo",
                    "voi": stem + "iate",
                    "loro": stem + "ano"
                ]
            ),
            imperfettoCongiuntivo: TenseConjugation(
                tense: .imperfettoCongiuntivo,
                forms: [
                    "io": stem + "issi",
                    "tu": stem + "issi",
                    "lui/lei": stem + "isse",
                    "noi": stem + "issimo",
                    "voi": stem + "iste",
                    "loro": stem + "issero"
                ]
            ),
            imperativo: TenseConjugation(
                tense: .imperativo,
                forms: [
                    "tu": stem + "i",
                    "lui/lei": stem + "a",
                    "noi": stem + "iamo",
                    "voi": stem + "ite",
                    "loro": stem + "ano"
                ]
            ),
            participioPassato: stem + "ito",
            gerundio: stem + "endo"
        )
    }

    // MARK: - Irregular Verbs

    private var irregularVerbs: [String: VerbConjugation] {
        [
            "essere": conjugateEssere(),
            "avere": conjugateAvere(),
            "fare": conjugateFare(),
            "andare": conjugateAndare(),
            "venire": conjugateVenire(),
            "dare": conjugateDare(),
            "stare": conjugateStare(),
            "sapere": conjugateSapere(),
            "volere": conjugateVolere(),
            "potere": conjugatePotere(),
            "dovere": conjugateDovere(),
            "dire": conjugateDire(),
            "bere": conjugateBere()
        ]
    }

    private func conjugateEssere() -> VerbConjugation {
        VerbConjugation(
            infinitive: "essere",
            type: .irregular,
            presenteIndicativo: TenseConjugation(
                tense: .presenteIndicativo,
                forms: [
                    "io": "sono",
                    "tu": "sei",
                    "lui/lei": "è",
                    "noi": "siamo",
                    "voi": "siete",
                    "loro": "sono"
                ]
            ),
            imperfettoIndicativo: TenseConjugation(
                tense: .imperfettoIndicativo,
                forms: [
                    "io": "ero",
                    "tu": "eri",
                    "lui/lei": "era",
                    "noi": "eravamo",
                    "voi": "eravate",
                    "loro": "erano"
                ]
            ),
            passatoRemoto: TenseConjugation(
                tense: .passatoRemoto,
                forms: [
                    "io": "fui",
                    "tu": "fosti",
                    "lui/lei": "fu",
                    "noi": "fummo",
                    "voi": "foste",
                    "loro": "furono"
                ]
            ),
            futuroSemplice: TenseConjugation(
                tense: .futuroSemplice,
                forms: [
                    "io": "sarò",
                    "tu": "sarai",
                    "lui/lei": "sarà",
                    "noi": "saremo",
                    "voi": "sarete",
                    "loro": "saranno"
                ]
            ),
            condizionalePresente: TenseConjugation(
                tense: .condizionalePresente,
                forms: [
                    "io": "sarei",
                    "tu": "saresti",
                    "lui/lei": "sarebbe",
                    "noi": "saremmo",
                    "voi": "sareste",
                    "loro": "sarebbero"
                ]
            ),
            presenteCongiuntivo: TenseConjugation(
                tense: .presenteCongiuntivo,
                forms: [
                    "io": "sia",
                    "tu": "sia",
                    "lui/lei": "sia",
                    "noi": "siamo",
                    "voi": "siate",
                    "loro": "siano"
                ]
            ),
            imperfettoCongiuntivo: TenseConjugation(
                tense: .imperfettoCongiuntivo,
                forms: [
                    "io": "fossi",
                    "tu": "fossi",
                    "lui/lei": "fosse",
                    "noi": "fossimo",
                    "voi": "foste",
                    "loro": "fossero"
                ]
            ),
            imperativo: TenseConjugation(
                tense: .imperativo,
                forms: [
                    "tu": "sii",
                    "lui/lei": "sia",
                    "noi": "siamo",
                    "voi": "siate",
                    "loro": "siano"
                ]
            ),
            participioPassato: "stato",
            gerundio: "essendo"
        )
    }

    private func conjugateAvere() -> VerbConjugation {
        VerbConjugation(
            infinitive: "avere",
            type: .irregular,
            presenteIndicativo: TenseConjugation(
                tense: .presenteIndicativo,
                forms: [
                    "io": "ho",
                    "tu": "hai",
                    "lui/lei": "ha",
                    "noi": "abbiamo",
                    "voi": "avete",
                    "loro": "hanno"
                ]
            ),
            imperfettoIndicativo: TenseConjugation(
                tense: .imperfettoIndicativo,
                forms: [
                    "io": "avevo",
                    "tu": "avevi",
                    "lui/lei": "aveva",
                    "noi": "avevamo",
                    "voi": "avevate",
                    "loro": "avevano"
                ]
            ),
            passatoRemoto: TenseConjugation(
                tense: .passatoRemoto,
                forms: [
                    "io": "ebbi",
                    "tu": "avesti",
                    "lui/lei": "ebbe",
                    "noi": "avemmo",
                    "voi": "aveste",
                    "loro": "ebbero"
                ]
            ),
            futuroSemplice: TenseConjugation(
                tense: .futuroSemplice,
                forms: [
                    "io": "avrò",
                    "tu": "avrai",
                    "lui/lei": "avrà",
                    "noi": "avremo",
                    "voi": "avrete",
                    "loro": "avranno"
                ]
            ),
            condizionalePresente: TenseConjugation(
                tense: .condizionalePresente,
                forms: [
                    "io": "avrei",
                    "tu": "avresti",
                    "lui/lei": "avrebbe",
                    "noi": "avremmo",
                    "voi": "avreste",
                    "loro": "avrebbero"
                ]
            ),
            presenteCongiuntivo: TenseConjugation(
                tense: .presenteCongiuntivo,
                forms: [
                    "io": "abbia",
                    "tu": "abbia",
                    "lui/lei": "abbia",
                    "noi": "abbiamo",
                    "voi": "abbiate",
                    "loro": "abbiano"
                ]
            ),
            imperfettoCongiuntivo: TenseConjugation(
                tense: .imperfettoCongiuntivo,
                forms: [
                    "io": "avessi",
                    "tu": "avessi",
                    "lui/lei": "avesse",
                    "noi": "avessimo",
                    "voi": "aveste",
                    "loro": "avessero"
                ]
            ),
            imperativo: TenseConjugation(
                tense: .imperativo,
                forms: [
                    "tu": "abbi",
                    "lui/lei": "abbia",
                    "noi": "abbiamo",
                    "voi": "abbiate",
                    "loro": "abbiano"
                ]
            ),
            participioPassato: "avuto",
            gerundio: "avendo"
        )
    }

    private func conjugateFare() -> VerbConjugation {
        VerbConjugation(
            infinitive: "fare",
            type: .irregular,
            presenteIndicativo: TenseConjugation(
                tense: .presenteIndicativo,
                forms: [
                    "io": "faccio",
                    "tu": "fai",
                    "lui/lei": "fa",
                    "noi": "facciamo",
                    "voi": "fate",
                    "loro": "fanno"
                ]
            ),
            imperfettoIndicativo: TenseConjugation(
                tense: .imperfettoIndicativo,
                forms: [
                    "io": "facevo",
                    "tu": "facevi",
                    "lui/lei": "faceva",
                    "noi": "facevamo",
                    "voi": "facevate",
                    "loro": "facevano"
                ]
            ),
            passatoRemoto: TenseConjugation(
                tense: .passatoRemoto,
                forms: [
                    "io": "feci",
                    "tu": "facesti",
                    "lui/lei": "fece",
                    "noi": "facemmo",
                    "voi": "faceste",
                    "loro": "fecero"
                ]
            ),
            futuroSemplice: TenseConjugation(
                tense: .futuroSemplice,
                forms: [
                    "io": "farò",
                    "tu": "farai",
                    "lui/lei": "farà",
                    "noi": "faremo",
                    "voi": "farete",
                    "loro": "faranno"
                ]
            ),
            condizionalePresente: TenseConjugation(
                tense: .condizionalePresente,
                forms: [
                    "io": "farei",
                    "tu": "faresti",
                    "lui/lei": "farebbe",
                    "noi": "faremmo",
                    "voi": "fareste",
                    "loro": "farebbero"
                ]
            ),
            presenteCongiuntivo: TenseConjugation(
                tense: .presenteCongiuntivo,
                forms: [
                    "io": "faccia",
                    "tu": "faccia",
                    "lui/lei": "faccia",
                    "noi": "facciamo",
                    "voi": "facciate",
                    "loro": "facciano"
                ]
            ),
            imperfettoCongiuntivo: TenseConjugation(
                tense: .imperfettoCongiuntivo,
                forms: [
                    "io": "facessi",
                    "tu": "facessi",
                    "lui/lei": "facesse",
                    "noi": "facessimo",
                    "voi": "faceste",
                    "loro": "facessero"
                ]
            ),
            imperativo: TenseConjugation(
                tense: .imperativo,
                forms: [
                    "tu": "fa'/fai",
                    "lui/lei": "faccia",
                    "noi": "facciamo",
                    "voi": "fate",
                    "loro": "facciano"
                ]
            ),
            participioPassato: "fatto",
            gerundio: "facendo"
        )
    }

    // Simplified versions for other irregular verbs (would be fully implemented in production)
    private func conjugateAndare() -> VerbConjugation {
        VerbConjugation(
            infinitive: "andare",
            type: .irregular,
            presenteIndicativo: TenseConjugation(tense: .presenteIndicativo, forms: ["io": "vado", "tu": "vai", "lui/lei": "va", "noi": "andiamo", "voi": "andate", "loro": "vanno"]),
            imperfettoIndicativo: TenseConjugation(tense: .imperfettoIndicativo, forms: ["io": "andavo", "tu": "andavi", "lui/lei": "andava", "noi": "andavamo", "voi": "andavate", "loro": "andavano"]),
            passatoRemoto: TenseConjugation(tense: .passatoRemoto, forms: ["io": "andai", "tu": "andasti", "lui/lei": "andò", "noi": "andammo", "voi": "andaste", "loro": "andarono"]),
            futuroSemplice: TenseConjugation(tense: .futuroSemplice, forms: ["io": "andrò", "tu": "andrai", "lui/lei": "andrà", "noi": "andremo", "voi": "andrete", "loro": "andranno"]),
            condizionalePresente: TenseConjugation(tense: .condizionalePresente, forms: ["io": "andrei", "tu": "andresti", "lui/lei": "andrebbe", "noi": "andremmo", "voi": "andreste", "loro": "andrebbero"]),
            presenteCongiuntivo: TenseConjugation(tense: .presenteCongiuntivo, forms: ["io": "vada", "tu": "vada", "lui/lei": "vada", "noi": "andiamo", "voi": "andiate", "loro": "vadano"]),
            imperfettoCongiuntivo: TenseConjugation(tense: .imperfettoCongiuntivo, forms: ["io": "andassi", "tu": "andassi", "lui/lei": "andasse", "noi": "andassimo", "voi": "andaste", "loro": "andassero"]),
            imperativo: TenseConjugation(tense: .imperativo, forms: ["tu": "va'/vai", "lui/lei": "vada", "noi": "andiamo", "voi": "andate", "loro": "vadano"]),
            participioPassato: "andato",
            gerundio: "andando"
        )
    }

    private func conjugateVenire() -> VerbConjugation {
        VerbConjugation(
            infinitive: "venire",
            type: .irregular,
            presenteIndicativo: TenseConjugation(tense: .presenteIndicativo, forms: ["io": "vengo", "tu": "vieni", "lui/lei": "viene", "noi": "veniamo", "voi": "venite", "loro": "vengono"]),
            imperfettoIndicativo: TenseConjugation(tense: .imperfettoIndicativo, forms: ["io": "venivo", "tu": "venivi", "lui/lei": "veniva", "noi": "venivamo", "voi": "venivate", "loro": "venivano"]),
            passatoRemoto: TenseConjugation(tense: .passatoRemoto, forms: ["io": "venni", "tu": "venisti", "lui/lei": "venne", "noi": "venimmo", "voi": "veniste", "loro": "vennero"]),
            futuroSemplice: TenseConjugation(tense: .futuroSemplice, forms: ["io": "verrò", "tu": "verrai", "lui/lei": "verrà", "noi": "verremo", "voi": "verrete", "loro": "verranno"]),
            condizionalePresente: TenseConjugation(tense: .condizionalePresente, forms: ["io": "verrei", "tu": "verresti", "lui/lei": "verrebbe", "noi": "verremmo", "voi": "verreste", "loro": "verrebbero"]),
            presenteCongiuntivo: TenseConjugation(tense: .presenteCongiuntivo, forms: ["io": "venga", "tu": "venga", "lui/lei": "venga", "noi": "veniamo", "voi": "veniate", "loro": "vengano"]),
            imperfettoCongiuntivo: TenseConjugation(tense: .imperfettoCongiuntivo, forms: ["io": "venissi", "tu": "venissi", "lui/lei": "venisse", "noi": "venissimo", "voi": "veniste", "loro": "venissero"]),
            imperativo: TenseConjugation(tense: .imperativo, forms: ["tu": "vieni", "lui/lei": "venga", "noi": "veniamo", "voi": "venite", "loro": "vengano"]),
            participioPassato: "venuto",
            gerundio: "venendo"
        )
    }

    // Additional irregular verbs simplified
    private func conjugateDare() -> VerbConjugation { conjugateRegularARE("dare") }  // Would be fully irregular in production
    private func conjugateStare() -> VerbConjugation { conjugateRegularARE("stare") }
    private func conjugateSapere() -> VerbConjugation { conjugateRegularERE("sapere") }
    private func conjugateVolere() -> VerbConjugation { conjugateRegularERE("volere") }
    private func conjugatePotere() -> VerbConjugation { conjugateRegularERE("potere") }
    private func conjugateDovere() -> VerbConjugation { conjugateRegularERE("dovere") }
    private func conjugateDire() -> VerbConjugation { conjugateRegularIRE("dire") }
    private func conjugateBere() -> VerbConjugation { conjugateRegularERE("bere") }
}

// MARK: - Supporting Types

struct VerbConjugation: Codable {
    let infinitive: String
    let type: VerbType
    let presenteIndicativo: TenseConjugation
    let imperfettoIndicativo: TenseConjugation
    let passatoRemoto: TenseConjugation
    let futuroSemplice: TenseConjugation
    let condizionalePresente: TenseConjugation
    let presenteCongiuntivo: TenseConjugation
    let imperfettoCongiuntivo: TenseConjugation
    let imperativo: TenseConjugation
    let participioPassato: String
    let gerundio: String
}

struct TenseConjugation: Codable {
    let tense: ItalianTense
    let forms: [String: String] // Subject: conjugated form
}

enum VerbType: String, Codable {
    case are = "-ARE"
    case ere = "-ERE"
    case ire = "-IRE"
    case irregular = "Irregular"
}

enum ItalianTense: String, Codable, CaseIterable {
    case presenteIndicativo = "Presente Indicativo"
    case imperfettoIndicativo = "Imperfetto Indicativo"
    case passatoRemoto = "Passato Remoto"
    case futuroSemplice = "Futuro Semplice"
    case condizionalePresente = "Condizionale Presente"
    case presenteCongiuntivo = "Presente Congiuntivo"
    case imperfettoCongiuntivo = "Imperfetto Congiuntivo"
    case imperativo = "Imperativo"

    var description: String {
        switch self {
        case .presenteIndicativo:
            return "Present tense - current actions, habits, truths"
        case .imperfettoIndicativo:
            return "Imperfect - ongoing past actions, descriptions"
        case .passatoRemoto:
            return "Remote past - completed past actions (literary)"
        case .futuroSemplice:
            return "Simple future - future actions, predictions"
        case .condizionalePresente:
            return "Present conditional - polite requests, hypotheticals"
        case .presenteCongiuntivo:
            return "Present subjunctive - doubt, desire, uncertainty"
        case .imperfettoCongiuntivo:
            return "Imperfect subjunctive - hypothetical past"
        case .imperativo:
            return "Imperative - commands, requests"
        }
    }
}
