#!/usr/bin/env bash
# Mobile Build Script - Pre-flight checks and build for iOS/Android
# Usage: ./scripts/mobile-build.sh [ios|android]

set -euo pipefail

PLATFORM="${1:-}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Error handling
error_exit() {
	echo -e "${RED}ERROR: $1${NC}" >&2
	exit 1
}

warning() {
	echo -e "${YELLOW}WARNING: $1${NC}" >&2
}

success() {
	echo -e "${GREEN}✓ $1${NC}"
}

# Validate platform argument
if [[ -z "$PLATFORM" ]]; then
	error_exit "Platform not specified. Usage: $0 [ios|android]"
fi

if [[ "$PLATFORM" != "ios" && "$PLATFORM" != "android" ]]; then
	error_exit "Invalid platform '$PLATFORM'. Must be 'ios' or 'android'"
fi

echo "========================================"
echo "MirrorBuddy Mobile Build - ${PLATFORM^^}"
echo "========================================"
echo ""

# Pre-flight checks
echo "Running pre-flight checks..."
echo ""

# Check 1: Node.js
if ! command -v node &>/dev/null; then
	error_exit "Node.js is not installed"
fi
success "Node.js: $(node --version)"

# Check 2: npm
if ! command -v npm &>/dev/null; then
	error_exit "npm is not installed"
fi
success "npm: $(npm --version)"

# Check 3: Capacitor CLI
if ! command -v npx &>/dev/null; then
	error_exit "npx is not available"
fi
success "Capacitor CLI available via npx"

# Platform-specific checks
if [[ "$PLATFORM" == "ios" ]]; then
	echo ""
	echo "Checking iOS build requirements..."

	# Check for macOS
	if [[ "$(uname)" != "Darwin" ]]; then
		error_exit "iOS builds require macOS"
	fi
	success "Platform: macOS"

	# Check for Xcode
	if ! command -v xcodebuild &>/dev/null; then
		error_exit "Xcode is not installed. Install from the Mac App Store."
	fi
	XCODE_VERSION=$(xcodebuild -version | head -n 1 | awk '{print $2}')
	success "Xcode: version $XCODE_VERSION"

	# Check for Xcode Command Line Tools
	if ! xcode-select -p &>/dev/null; then
		error_exit "Xcode Command Line Tools not installed. Run: xcode-select --install"
	fi
	success "Xcode Command Line Tools: installed"

	# Check for CocoaPods
	if ! command -v pod &>/dev/null; then
		error_exit "CocoaPods is not installed. Run: sudo gem install cocoapods"
	fi
	POD_VERSION=$(pod --version)
	success "CocoaPods: version $POD_VERSION"

	# Check for ios platform directory
	if [[ ! -d "ios" ]]; then
		warning "ios/ directory not found. Run: npx cap add ios"
	else
		success "ios/ directory exists"
	fi

elif [[ "$PLATFORM" == "android" ]]; then
	echo ""
	echo "Checking Android build requirements..."

	# Check for ANDROID_HOME or ANDROID_SDK_ROOT
	if [[ -z "${ANDROID_HOME:-}" ]] && [[ -z "${ANDROID_SDK_ROOT:-}" ]]; then
		error_exit "ANDROID_HOME or ANDROID_SDK_ROOT environment variable not set"
	fi

	SDK_PATH="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
	success "Android SDK: $SDK_PATH"

	# Check for Android SDK tools
	if [[ ! -d "$SDK_PATH/platform-tools" ]]; then
		error_exit "Android SDK platform-tools not found at $SDK_PATH/platform-tools"
	fi
	success "Android SDK platform-tools: installed"

	# Check for Java (required for Android builds)
	if ! command -v java &>/dev/null; then
		error_exit "Java is not installed. Android builds require JDK 11 or higher."
	fi
	JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
	success "Java: version $JAVA_VERSION"

	# Check for Gradle (usually bundled with Android project)
	if [[ -f "android/gradlew" ]]; then
		success "Gradle wrapper: found"
	else
		warning "Gradle wrapper not found at android/gradlew"
	fi

	# Check for android platform directory
	if [[ ! -d "android" ]]; then
		warning "android/ directory not found. Run: npx cap add android"
	else
		success "android/ directory exists"
	fi
fi

echo ""
echo "========================================"
echo "Pre-flight checks complete!"
echo "========================================"
echo ""

# Build web assets
echo "Building web assets..."
npm run build:mobile:web || error_exit "Web build failed"
success "Web build complete"

# Copy web assets to native project
echo ""
echo "Copying web assets to ${PLATFORM}..."
npx cap copy "$PLATFORM" || error_exit "Failed to copy assets to ${PLATFORM}"
success "Assets copied to ${PLATFORM}"

# Sync Capacitor configuration
echo ""
echo "Syncing Capacitor configuration..."
npx cap sync "$PLATFORM" || error_exit "Failed to sync Capacitor for ${PLATFORM}"
success "Capacitor sync complete"

# Platform-specific post-sync steps
if [[ "$PLATFORM" == "ios" ]]; then
	echo ""
	echo "Installing iOS dependencies via CocoaPods..."
	if [[ -d "ios/App" ]]; then
		(cd ios/App && pod install) || error_exit "CocoaPods install failed"
		success "CocoaPods dependencies installed"
	else
		warning "ios/App directory not found, skipping CocoaPods install"
	fi
fi

echo ""
echo "========================================"
echo "Build preparation complete!"
echo "========================================"
echo ""
echo "Next steps:"
if [[ "$PLATFORM" == "ios" ]]; then
	echo "  1. Open Xcode: npm run open:ios"
	echo "  2. Build in Xcode or use Fastlane: cd ios && fastlane beta"
elif [[ "$PLATFORM" == "android" ]]; then
	echo "  1. Open Android Studio: npm run open:android"
	echo "  2. Build in Android Studio or use Fastlane: cd android && fastlane beta"
fi
echo ""
