/**
 * Example: Language Selector Component with Sync
 * Demonstrates how to use useLanguageSync for language preference management
 */

import { useLanguageSync } from "@/hooks/use-language-sync";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LanguageSelector() {
  const { currentLanguage, changeLanguage, isInitialized, isLoading } =
    useLanguageSync();

  const handleLanguageChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newLanguage = event.target.value as Locale;
    await changeLanguage(newLanguage);
    // Cookie updated ✓
    // Settings store updated ✓
    // Profile synced to server ✓
  };

  if (isLoading) {
    return <div>Loading language...</div>;
  }

  return (
    <div className="language-selector">
      <label htmlFor="language-select">Language:</label>
      <select
        id="language-select"
        value={currentLanguage}
        onChange={handleLanguageChange}
        disabled={!isInitialized}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeNames[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Example: Post-Login Language Sync
 * Syncs cookie language to user profile after successful login
 */

import { useLanguageSyncAfterLogin } from "@/hooks/use-language-sync";
import { csrfFetch } from "@/lib/auth/csrf-client";

export function LoginForm() {
  const { syncAfterLogin } = useLanguageSyncAfterLogin();

  const handleLogin = async (username: string, password: string) => {
    try {
      // Perform login
      const response = await csrfFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        // Sync cookie language to newly loaded profile
        await syncAfterLogin();
        // If user had NEXT_LOCALE=fr cookie and profile was "it",
        // profile is now updated to "fr" to match cookie preference
      }
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        handleLogin(
          formData.get("username") as string,
          formData.get("password") as string,
        );
      }}
    >
      <input type="text" name="username" required />
      <input type="password" name="password" required />
      <button type="submit">Login</button>
    </form>
  );
}

/**
 * Example: Welcome Page Integration
 * Language selector on welcome page (before login)
 */

export function WelcomeLanguageSelector() {
  const { currentLanguage, changeLanguage } = useLanguageSync();

  // Language is stored in cookie, persists across page refreshes
  // When user eventually registers/logs in, cookie is synced to profile

  return (
    <div className="welcome-language">
      <h3>Choose your language</h3>
      <div className="language-grid">
        {locales.map((locale) => (
          <button
            key={locale}
            onClick={() => changeLanguage(locale)}
            className={currentLanguage === locale ? "active" : ""}
          >
            {localeNames[locale]}
          </button>
        ))}
      </div>
    </div>
  );
}
