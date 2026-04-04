import { useState, Suspense, lazy } from "react";
import { Tag, Bell, User, Monitor } from "lucide-react";
import type { Category } from "../types";
import { Switch } from "./ui/Switch";
import CategorySettings from "./CategorySettings";
import AccountSettings from "./AccountSettings";

const NotificationSettings = lazy(() => import("./NotificationSettings"));

interface SettingsProps {
  categories: Category[];
  onCategoriesChange: () => void;
  useVibrancy: boolean;
  setUseVibrancy: (val: boolean | ((prev: boolean) => boolean)) => void;
}

type SettingsTab = "categories" | "notifications" | "appearance" | "account";

const TabIcons = {
  categories: Tag,
  notifications: Bell,
  appearance: Monitor,
  account: User,
} as const;

const tabs: { key: SettingsTab; label: string; Icon: typeof Tag }[] = [
  { key: "categories", label: "Categories", Icon: TabIcons.categories },
  {
    key: "notifications",
    label: "Notifications",
    Icon: TabIcons.notifications,
  },
  { key: "appearance", label: "Appearance", Icon: TabIcons.appearance },
  { key: "account", label: "Account", Icon: TabIcons.account },
];

export default function Settings({
  categories,
  onCategoriesChange,
  useVibrancy,
  setUseVibrancy,
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("categories");
  const [hoveredTab, setHoveredTab] = useState<SettingsTab | null>(null);

  return (
    <div className="max-w-2xl">
      {/* Refined Tab Navigation */}
      <div className="relative mb-10">
        {/* Tab Bar Container with subtle depth */}
        <div
          className="relative inline-flex rounded-2xl p-1.5 gap-1"
          style={{
            backgroundColor: "var(--settings-tabs-bg)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--settings-tabs-border)",
            boxShadow: "var(--settings-tabs-shadow)",
          }}
        >
          {tabs.map((tab, index) => {
            const Icon = tab.Icon;
            const isActive = activeTab === tab.key;
            const isHovered = hoveredTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                onMouseEnter={() => setHoveredTab(tab.key)}
                onMouseLeave={() => setHoveredTab(null)}
                className="relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-300"
                style={{
                  backgroundColor: isActive
                    ? "var(--settings-tab-active-bg)"
                    : isHovered
                      ? "var(--settings-tab-hover-bg)"
                      : "transparent",
                  color: isActive
                    ? "var(--settings-tab-active-text)"
                    : "var(--settings-tab-inactive-text)",
                  boxShadow: isActive
                    ? "var(--settings-tab-active-shadow)"
                    : "none",
                  transform: isActive ? "translateY(-1px)" : "translateY(0)",
                  letterSpacing: "-0.01em",
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: "backwards",
                }}
              >
                {/* Icon with subtle glow on active */}
                <Icon
                  className="w-[15px] h-[15px] transition-all duration-300"
                  style={{
                    filter: isActive ? "var(--settings-tab-icon-glow)" : "none",
                    color: isActive
                      ? "var(--settings-tab-icon-active)"
                      : "inherit",
                  }}
                />

                {/* Label */}
                <span className="relative">
                  {tab.label}

                  {/* Active indicator - subtle gradient underline */}
                  {isActive && (
                    <span
                      className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full transition-opacity duration-300"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, var(--brand-primary), transparent)",
                        opacity: 0.6,
                      }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Ambient glow beneath tabs */}
        <div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 rounded-full blur-2xl"
          style={{
            background:
              "radial-gradient(ellipse, var(--brand-primary), transparent 70%)",
            opacity: "var(--settings-tab-ambient-opacity)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Tab Content */}
      {activeTab === "categories" ? (
        <CategorySettings
          categories={categories}
          onCategoriesChange={onCategoriesChange}
        />
      ) : null}

      {activeTab === "notifications" ? (
        <Suspense
          fallback={
            <div className="card">
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{
                    borderColor: "var(--text-muted)",
                    borderTopColor: "transparent",
                  }}
                />
                <span style={{ color: "var(--text-muted)" }}>
                  Loading notification settings...
                </span>
              </div>
            </div>
          }
        >
          <NotificationSettings />
        </Suspense>
      ) : null}

      {activeTab === "appearance" ? (
        <div className="space-y-8 animate-in">
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "var(--bg-hover)" }}
              >
                <Monitor
                  className="w-5 h-5"
                  style={{ color: "var(--text-muted)" }}
                />
              </div>
              <div>
                <h3
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Appearance
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Customize the look and feel of your app
                </p>
              </div>
            </div>

            <div className="label mb-3">Interface Styles</div>
            <div className="space-y-4">
              <div className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Translucent Backgrounds
                  </label>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Enable native translucent shell surfaces in dark mode
                  </p>
                </div>
                <Switch
                  checked={useVibrancy}
                  onCheckedChange={setUseVibrancy}
                  aria-label="Toggle translucent backgrounds"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "account" ? <AccountSettings /> : null}
    </div>
  );
}
