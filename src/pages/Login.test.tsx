import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();
const mockUpdatePassword = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    resetPassword: mockResetPassword,
    updatePassword: mockUpdatePassword,
    user: null,
    session: null,
    loading: false,
  }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: "en",
    setLanguage: vi.fn(),
  }),
}));

vi.mock("../services/biometricService", () => ({
  checkBiometricAvailability: vi.fn().mockResolvedValue(null),
  authenticateWithBiometric: vi.fn(),
  getBiometricCredentials: vi.fn(),
  saveBiometricCredentials: vi.fn(),
  BiometricStatus: {},
}));

const mockSearchParams = new URLSearchParams();
vi.mock("react-router-dom", () => ({
  useSearchParams: () => [mockSearchParams],
  useNavigate: () => vi.fn(),
}));

import Login from "./Login";

function renderLogin() {
  return render(<Login />);
}

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Form rendering", () => {
    it("renders email input", () => {
      renderLogin();
      expect(screen.getByLabelText("login.email")).toBeInTheDocument();
    });

    it("renders password input", () => {
      renderLogin();
      expect(screen.getByLabelText("login.password")).toBeInTheDocument();
    });

    it("renders sign-in submit button", () => {
      renderLogin();
      // The button text is the translation key for signIn
      expect(
        screen.getByRole("button", { name: /login\.signIn/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Sign in flow", () => {
    it("submits with email/password and calls signIn", async () => {
      mockSignIn.mockResolvedValue({ error: null });
      renderLogin();

      fireEvent.change(screen.getByLabelText("login.email"), {
        target: { value: "user@test.com" },
      });
      fireEvent.change(screen.getByLabelText("login.password"), {
        target: { value: "password123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /login\.signIn/i }));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("user@test.com", "password123");
      });
    });

    it("shows error when signIn returns error", async () => {
      mockSignIn.mockResolvedValue({
        error: { message: "Invalid credentials" },
      });
      renderLogin();

      fireEvent.change(screen.getByLabelText("login.email"), {
        target: { value: "user@test.com" },
      });
      fireEvent.change(screen.getByLabelText("login.password"), {
        target: { value: "wrong" },
      });

      fireEvent.click(screen.getByRole("button", { name: /login\.signIn/i }));

      await waitFor(() => {
        expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
      });
    });
  });

  describe("Sign up toggle", () => {
    it("can switch to sign-up mode", async () => {
      const user = userEvent.setup();
      renderLogin();

      // In sign-in mode, the toggle button says "login.signUp"
      // The toggle is inside the footer text, not the submit button
      const toggleButton = screen.getByText("login.signUp", {
        selector: "button",
      });
      await user.click(toggleButton);

      // After toggling, heading should show createAccount
      expect(screen.getByText("login.createAccount")).toBeInTheDocument();
    });

    it("can switch back to sign-in mode", async () => {
      const user = userEvent.setup();
      renderLogin();

      // Switch to sign-up
      const signUpToggle = screen.getByText("login.signUp", {
        selector: "button",
      });
      await user.click(signUpToggle);

      // Now switch back — the toggle text is "login.signIn" in the footer
      const signInToggle = screen.getByText("login.signIn", {
        selector: "button",
      });
      await user.click(signInToggle);

      // Heading should show welcomeBack again
      expect(screen.getByText("login.welcomeBack")).toBeInTheDocument();
    });
  });

  describe("Sign up flow", () => {
    it("calls signUp with email/password", async () => {
      mockSignUp.mockResolvedValue({ error: null });
      const user = userEvent.setup();
      renderLogin();

      // Switch to sign-up mode
      const toggleButton = screen.getByText("login.signUp", {
        selector: "button",
      });
      await user.click(toggleButton);

      fireEvent.change(screen.getByLabelText("login.email"), {
        target: { value: "new@test.com" },
      });
      fireEvent.change(screen.getByLabelText("login.password"), {
        target: { value: "newpass123" },
      });

      // Submit button now says "login.signUp" (as the submit button text)
      const submitButton = screen.getByRole("button", {
        name: /login\.signUp/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith("new@test.com", "newpass123");
      });
    });
  });

  describe("Password reset", () => {
    it("shows reset form when forgot password clicked", async () => {
      const user = userEvent.setup();
      renderLogin();

      const forgotButton = screen.getByText("login.forgotPassword");
      await user.click(forgotButton);

      // Should show the reset password heading (also appears in info box span,
      // so use selector to target the h2 heading specifically)
      expect(
        screen.getByText("login.resetPassword", { selector: "h2" }),
      ).toBeInTheDocument();
      // Should show the send reset link button
      expect(
        screen.getByRole("button", { name: /login\.sendResetLink/i }),
      ).toBeInTheDocument();
    });

    it("calls resetPassword with email", async () => {
      mockResetPassword.mockResolvedValue({ error: null });
      const user = userEvent.setup();
      renderLogin();

      // Navigate to reset form
      await user.click(screen.getByText("login.forgotPassword"));

      fireEvent.change(screen.getByLabelText("login.email"), {
        target: { value: "reset@test.com" },
      });

      fireEvent.click(
        screen.getByRole("button", { name: /login\.sendResetLink/i }),
      );

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith("reset@test.com");
      });
    });

    it("can navigate back to sign in from reset form", async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByText("login.forgotPassword"));
      expect(
        screen.getByText("login.resetPassword", { selector: "h2" }),
      ).toBeInTheDocument();

      await user.click(screen.getByText("Back to Sign In"));
      expect(screen.getByText("login.welcomeBack")).toBeInTheDocument();
    });
  });
});
