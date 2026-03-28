import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Mail,
  Lock,
  Check,
  Fingerprint,
  ScanFace,
  Circle,
  CheckCircle2,
} from "lucide-react";
import { Button, Input, Card } from "../components/ui";
import {
  checkBiometricAvailability,
  authenticateWithBiometric,
  getBiometricCredentials,
  saveBiometricCredentials,
  BiometricStatus,
} from "../services/biometricService";

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] =
    useState<BiometricStatus | null>(null);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const type = searchParams.get("type");
    if (accessToken && type === "recovery") {
      setShowResetForm(true);
      setShowResetPassword(false);
    }
  }, [searchParams]);

  useEffect(() => {
    checkBiometricAvailability().then(setBiometricStatus);
  }, []);

  const handleBiometricLogin = async () => {
    setError("");
    setLoading(true);

    const authenticated = await authenticateWithBiometric();
    if (!authenticated) {
      setError("Biometric authentication failed");
      setLoading(false);
      return;
    }

    const credentials = await getBiometricCredentials();
    if (!credentials) {
      setError("No saved credentials found");
      setLoading(false);
      return;
    }

    const { error } = await signIn(credentials.email, credentials.password);
    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleSaveBiometricCredentials = async () => {
    if (!pendingCredentials) return;

    await saveBiometricCredentials(
      pendingCredentials.email,
      pendingCredentials.password,
    );
    setPendingCredentials(null);
    setShowBiometricSetup(false);
  };

  const handleSkipBiometricSetup = () => {
    setPendingCredentials(null);
    setShowBiometricSetup(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(t("login.signUpSuccess"));
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else if (biometricStatus?.isAvailable && !biometricStatus.isEnabled) {
        setPendingCredentials({ email, password });
        setShowBiometricSetup(true);
      }
    }
    setLoading(false);
  };

  const handleResetPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email) {
      setError(t("login.enterEmail"));
      setLoading(false);
      return;
    }

    const { error } = await resetPassword(email);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(t("login.passwordResetSent"));
    }
    setLoading(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (newPassword.length < 6) {
      setError(t("login.passwordMinLength"));
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("login.passwordsDontMatch"));
      setLoading(false);
      return;
    }

    const { error } = await updatePassword(newPassword);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(t("login.passwordUpdated"));
      setTimeout(() => {
        navigate("/");
        window.location.reload();
      }, 2000);
    }
    setLoading(false);
  };

  const features = [
    { label: "AI-Powered Analysis", color: "bg-green-500" },
    { label: "Mind Mapping", color: "bg-blue-500" },
    { label: "Goal Tracking", color: "bg-purple-500" },
  ];

  return (
    <div className="min-h-screen w-full flex bg-gray-50 dark:bg-gray-950">
      <div className="hidden lg:flex w-1/2 bg-gray-900 flex-col justify-center px-16 xl:px-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20" />
        <div className="relative z-10 max-w-lg">
          <img src="/logo-dark.png" alt="COMMIT" className="h-20 w-auto mb-8" />
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Design Your Life,
            <br />
            <span className="text-indigo-400">Achieve Your Goals</span>
          </h1>
          <p className="text-gray-300 text-lg mb-8">
            The COMMIT framework helps you gain clarity, track progress, and
            unlock your potential through structured journaling and AI-powered
            insights.
          </p>

          <div className="flex flex-wrap gap-3">
            {features.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg"
              >
                <div className={`w-2 h-2 ${feature.color} rounded-full`} />
                <span className="text-sm text-gray-200">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <img
              src="/logo-icon.png"
              alt="COMMIT"
              className="h-32 w-auto mx-auto mb-4"
            />
          </div>

          <Card variant="default" padding="lg" className="shadow-lg">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {showResetForm
                  ? t("login.setNewPassword")
                  : showResetPassword
                    ? t("login.resetPassword")
                    : isSignUp
                      ? t("login.createAccount")
                      : t("login.welcomeBack")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {showResetForm
                  ? t("login.setNewPasswordDescription")
                  : showResetPassword
                    ? t("login.resetPasswordDescription")
                    : isSignUp
                      ? t("login.startJourney")
                      : t("login.enterDetails")}
              </p>
            </div>

            {showResetForm ? (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {t("login.setNewPassword")}
                    </span>
                  </div>
                </div>

                <Input
                  label={t("login.newPassword")}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />

                <Input
                  label={t("login.confirmPassword")}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />

                {error && <ErrorMessage message={error} />}
                {success && <SuccessMessage message={success} />}

                <Button type="submit" fullWidth loading={loading}>
                  {t("login.updatePassword")}
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setShowResetForm(false);
                    navigate("/");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Back to Sign In
                </button>
              </form>
            ) : showResetPassword ? (
              <form onSubmit={handleResetPasswordRequest} className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {t("login.resetPassword")}
                    </span>
                  </div>
                </div>

                <Input
                  label={t("login.email")}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />

                {error && <ErrorMessage message={error} />}
                {success && <SuccessMessage message={success} />}

                <Button type="submit" fullWidth loading={loading}>
                  {t("login.sendResetLink")}
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setError("");
                    setSuccess("");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label={t("login.email")}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />

                <Input
                  label={t("login.password")}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />

                {isSignUp && password.length > 0 && (
                  <PasswordStrengthIndicator password={password} t={t} />
                )}

                {!isSignUp && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetPassword(true);
                        setError("");
                        setSuccess("");
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                    >
                      {t("login.forgotPassword")}
                    </button>
                  </div>
                )}

                {error && <ErrorMessage message={error} />}
                {success && <SuccessMessage message={success} />}

                <Button type="submit" fullWidth loading={loading}>
                  {isSignUp ? t("login.signUp") : t("login.signIn")}
                  <ArrowRight className="w-4 h-4" />
                </Button>

                {!isSignUp &&
                  biometricStatus?.isAvailable &&
                  biometricStatus.isEnabled && (
                    <>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
                            or
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        fullWidth
                        onClick={handleBiometricLogin}
                        disabled={loading}
                      >
                        {biometricStatus.biometryType === "faceId" ? (
                          <ScanFace className="w-5 h-5" />
                        ) : (
                          <Fingerprint className="w-5 h-5" />
                        )}
                        {biometricStatus.biometryType === "faceId"
                          ? "Sign in with Face ID"
                          : biometricStatus.biometryType === "touchId"
                            ? "Sign in with Touch ID"
                            : "Sign in with Biometrics"}
                      </Button>
                    </>
                  )}
              </form>
            )}

            {showBiometricSetup && biometricStatus && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  {biometricStatus.biometryType === "faceId" ? (
                    <ScanFace className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Fingerprint className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      Enable{" "}
                      {biometricStatus.biometryType === "faceId"
                        ? "Face ID"
                        : "Touch ID"}
                      ?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sign in faster next time
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveBiometricCredentials}>
                    Enable
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleSkipBiometricSetup}
                  >
                    Not now
                  </Button>
                </div>
              </div>
            )}

            {!showResetPassword && !showResetForm && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isSignUp
                    ? t("login.alreadyHaveAccount")
                    : t("login.dontHaveAccount")}
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="ml-1 font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    {isSignUp ? t("login.signIn") : t("login.signUp")}
                  </button>
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
      <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
      {message}
    </div>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
      <Check className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  );
}

interface PasswordCheck {
  key: string;
  label: string;
  met: boolean;
}

function getPasswordChecks(
  password: string,
  t: (key: string) => string,
): PasswordCheck[] {
  return [
    {
      key: "length",
      label: t("password.minLength") || "8+ characters",
      met: password.length >= 8,
    },
    {
      key: "upper",
      label: t("password.uppercase") || "Uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      key: "lower",
      label: t("password.lowercase") || "Lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      key: "number",
      label: t("password.number") || "Number",
      met: /\d/.test(password),
    },
    {
      key: "special",
      label: t("password.special") || "Special character",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

const STRENGTH_CONFIG = [
  {
    label: "weak",
    color: "bg-red-500",
    textColor: "text-red-600 dark:text-red-400",
  },
  {
    label: "fair",
    color: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  {
    label: "good",
    color: "bg-blue-500",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  {
    label: "strong",
    color: "bg-green-500",
    textColor: "text-green-600 dark:text-green-400",
  },
];

function PasswordStrengthIndicator({
  password,
  t,
}: {
  password: string;
  t: (key: string) => string;
}) {
  const checks = getPasswordChecks(password, t);
  const metCount = checks.filter((c) => c.met).length;
  const strengthIdx =
    metCount <= 1 ? 0 : metCount <= 2 ? 1 : metCount <= 4 ? 2 : 3;
  const strength = STRENGTH_CONFIG[strengthIdx];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {STRENGTH_CONFIG.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= strengthIdx
                  ? strength.color
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
        <span className={`text-[10px] font-medium ${strength.textColor}`}>
          {t(`password.${strength.label}`) || strength.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {checks.map((check) => (
          <div key={check.key} className="flex items-center gap-1.5">
            {check.met ? (
              <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
            ) : (
              <Circle className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
            )}
            <span
              className={`text-[10px] ${check.met ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}
            >
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
