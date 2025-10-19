import MapKit
import SwiftUI

/// Interactive map showing historical locations with annotations
struct HistoricalMapView: View {
    let locations: [HistoricalLocation]
    @State private var selectedLocation: HistoricalLocation?
    @State private var region: MKCoordinateRegion

    init(locations: [HistoricalLocation]) {
        self.locations = locations
        _region = State(initialValue: Self.calculateRegion(for: locations))
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Map
            Map(
                coordinateRegion: $region,
                annotationItems: locations
            ) { location in
                MapAnnotation(coordinate: location.coordinate) {
                    LocationMarker(
                        location: location,
                        isSelected: selectedLocation?.id == location.id
                    )
                    .onTapGesture {
                        withAnimation(.spring()) {
                            selectedLocation = location
                        }
                    }
                }
            }
            .ignoresSafeArea()

            // Location Details Card
            if let selected = selectedLocation {
                LocationDetailCard(location: selected) {
                    withAnimation(.spring()) {
                        selectedLocation = nil
                    }
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .navigationTitle("Historical Map")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button(action: { zoomToFitAll() }) {
                        Label("Show All", systemImage: "map")
                    }

                    Button(action: { resetZoom() }) {
                        Label("Reset Zoom", systemImage: "arrow.counterclockwise")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
    }

    private static func calculateRegion(for locations: [HistoricalLocation]) -> MKCoordinateRegion {
        guard !locations.isEmpty else {
            return MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: 0, longitude: 0),
                span: MKCoordinateSpan(latitudeDelta: 180, longitudeDelta: 180)
            )
        }

        var minLat = locations[0].latitude
        var maxLat = locations[0].latitude
        var minLon = locations[0].longitude
        var maxLon = locations[0].longitude

        for location in locations {
            minLat = min(minLat, location.latitude)
            maxLat = max(maxLat, location.latitude)
            minLon = min(minLon, location.longitude)
            maxLon = max(maxLon, location.longitude)
        }

        let center = CLLocationCoordinate2D(
            latitude: (minLat + maxLat) / 2,
            longitude: (minLon + maxLon) / 2
        )

        let span = MKCoordinateSpan(
            latitudeDelta: (maxLat - minLat) * 1.5,
            longitudeDelta: (maxLon - minLon) * 1.5
        )

        return MKCoordinateRegion(center: center, span: span)
    }

    private func zoomToFitAll() {
        withAnimation {
            region = Self.calculateRegion(for: locations)
        }
    }

    private func resetZoom() {
        withAnimation {
            region = Self.calculateRegion(for: locations)
        }
    }
}

// MARK: - Location Marker

struct LocationMarker: View {
    let location: HistoricalLocation
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Color.red)
                    .frame(width: isSelected ? 32 : 24, height: isSelected ? 32 : 24)

                if isSelected {
                    Circle()
                        .stroke(Color.red, lineWidth: 3)
                        .frame(width: 44, height: 44)
                }

                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(.white)
                    .font(.system(size: isSelected ? 16 : 12))
            }

            if isSelected {
                Text(location.name)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        Capsule()
                            .fill(Color.red)
                    )
                    .offset(y: 4)
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
    }
}

// MARK: - Location Detail Card

struct LocationDetailCard: View {
    let location: HistoricalLocation
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(location.name)
                        .font(.title3)
                        .fontWeight(.bold)

                    Text(location.timeframe)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundColor(.secondary)
                }
            }

            Divider()

            // Description
            VStack(alignment: .leading, spacing: 8) {
                Label("Description", systemImage: "text.alignleft")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(location.description)
                    .font(.body)
            }

            // Historical Significance
            VStack(alignment: .leading, spacing: 8) {
                Label("Historical Significance", systemImage: "star.fill")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(location.historicalSignificance)
                    .font(.body)
            }

            // Related Events
            if !location.relatedEvents.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Related Events", systemImage: "calendar")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(location.relatedEvents, id: \.self) { event in
                                EventChip(text: event)
                            }
                        }
                    }
                }
            }

            // Coordinates
            HStack {
                Image(systemName: "location.fill")
                    .foregroundColor(.blue)
                Text(String(format: "%.4f, %.4f", location.latitude, location.longitude))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: -2)
        )
        .padding()
    }
}

// MARK: - Event Chip

struct EventChip: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(Color.blue.opacity(0.1))
            )
            .foregroundColor(.blue)
    }
}

// MARK: - Preview

#Preview {
    NavigationView {
        HistoricalMapView(
            locations: [
                HistoricalLocation(
                    name: "Normandy Beaches",
                    latitude: 49.3419,
                    longitude: -0.8467,
                    description: "Site of the D-Day landings during World War II.",
                    historicalSignificance: "The Normandy landings were the landing operations on Tuesday, 6 June 1944 of the Allied invasion of Normandy in Operation Overlord during World War II.",
                    timeframe: "June 6, 1944",
                    relatedEvents: ["D-Day", "Operation Overlord", "Liberation of France"]
                ),
                HistoricalLocation(
                    name: "Berlin Wall",
                    latitude: 52.5200,
                    longitude: 13.4050,
                    description: "Barrier that divided Berlin from 1961 to 1989.",
                    historicalSignificance: "Symbol of the Cold War and the Iron Curtain between Western Europe and the Eastern Bloc.",
                    timeframe: "1961-1989",
                    relatedEvents: ["Fall of the Berlin Wall", "German Reunification", "End of Cold War"]
                ),
                HistoricalLocation(
                    name: "Gettysburg",
                    latitude: 39.8309,
                    longitude: -77.2311,
                    description: "Site of the Battle of Gettysburg, a turning point in the American Civil War.",
                    historicalSignificance: "The battle involved the largest number of casualties of the entire war and is often described as the war's turning point.",
                    timeframe: "July 1-3, 1863",
                    relatedEvents: ["Battle of Gettysburg", "Gettysburg Address", "American Civil War"]
                )
            ]
        )
    }
}
