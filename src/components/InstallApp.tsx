import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./Text";
import { Card } from "./Card";
import { Button } from "./Button";

type InstallOffer = { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type InstallWindow = Window & { lifeAnalyticsInstallPrompt?: InstallOffer | null; lifeAnalyticsInstalled?: boolean };
export function InstallApp({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [android, setAndroid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const browser = window as InstallWindow;
    const media = window.matchMedia("(display-mode: standalone)");
    const update = () => {
      setReady(!!browser.lifeAnalyticsInstallPrompt);
      setInstalled(!!browser.lifeAnalyticsInstalled || media.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    };
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setAndroid(/Android/.test(navigator.userAgent));
    update();
    window.addEventListener("lifeanalytics-install-ready", update);
    window.addEventListener("appinstalled", update);
    media.addEventListener("change", update);
    return () => {
      window.removeEventListener("lifeanalytics-install-ready", update);
      window.removeEventListener("appinstalled", update);
      media.removeEventListener("change", update);
    };
  }, []);
  if (Platform.OS !== "web") return null;
  async function install() {
    const browser = window as InstallWindow;
    const offer = browser.lifeAnalyticsInstallPrompt;
    if (!offer || busy) return;
    setBusy(true); setMessage("");
    try {
      await offer.prompt();
      const choice = await offer.userChoice;
      setMessage(choice.outcome === "accepted" ? "Installation requested. Look for Life Analytics on your home screen or in your apps." : "No problem. You can install later from your browser menu.");
    } catch { setMessage("Use your browser menu to install, or try again after refreshing."); }
    finally { browser.lifeAnalyticsInstallPrompt = null; setReady(false); setBusy(false); }
  }
  const trigger = installed ? <Text>Installed · Launch Life Analytics from your home screen.</Text> : <Button label="Install app" icon="download-outline" onPress={() => setOpen(true)} />;
  return <>
    {compact ? !installed && <Pressable accessibilityRole="button" accessibilityLabel="Install app" onPress={() => setOpen(true)} style={{ padding: 10 }}><Ionicons name="download-outline" size={20} color="#C4B5FD" /></Pressable> :
      <Card><Text variant="heading">Your daily check-in, one tap away</Text><Text>Add Life Analytics to your home screen. It opens in its own app window.</Text>{trigger}</Card>}
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 24 }}>
        <View accessibilityViewIsModal style={{ backgroundColor: "#211B30", padding: 24, borderRadius: 28, gap: 18, width: "100%", maxWidth: 420, alignSelf: "center" }}>
          <Ionicons name={installed ? "checkmark-circle-outline" : "download-outline"} color="#C4B5FD" size={42} />
          <Text style={{ color: "#FAF8FF", fontSize: 26, fontWeight: "800", lineHeight: 32 }}>{installed ? "You're all set." : "Make it your app."}</Text>
          <Text style={{ color: "#D4CCE3" }}>{installed ? "Life Analytics is installed. Open it from your home screen or apps." : "Your check-in, with its own icon and no browser tabs."}</Text>
          {!installed && (ready ? <Button label={busy ? "Opening installer…" : "Install Life Analytics"} disabled={busy} onPress={() => void install()} /> :
            <Text style={{ color: "#D4CCE3", lineHeight: 25 }}>{ios ? "In Safari, tap Share → Add to Home Screen. Turn on Open as Web App if shown, then tap Add." : android ? "Open this page in Chrome. Tap the ⋮ menu → Add to Home screen → Install. The exact wording may vary." : "In Chrome or Edge, use the install icon in the address bar, or the browser menu → Install app. If it isn't available yet, refresh this page."}</Text>)}
          {!!message && <Text accessibilityLiveRegion="polite" style={{ color: "#C4B5FD" }}>{message}</Text>}
          {!installed && <Text style={{ color: "#ABA5BC", fontSize: 12, lineHeight: 18 }}>Internet is needed to open the app and use voice. Data is stored on this device; an installed app may start with separate browser storage.</Text>}
          <Button label="Done" variant="secondary" onPress={() => setOpen(false)} />
        </View>
      </View>
    </Modal>
  </>;
}
