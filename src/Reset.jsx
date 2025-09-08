// src/Reset.jsx
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  AppShell,
  Paper,
  Title,
  Text,
  Group,
  Button,
  PasswordInput,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

export default function Reset() {
  const [checking, setChecking] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [busy, setBusy] = useState(false);

  // 1) On load, detect if the URL contains recovery tokens and a session is created
  useEffect(() => {
    let unsub;
    (async () => {
      // If detectSessionInUrl already processed the hash, session will exist now
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setCanReset(true);
        setChecking(false);
      } else {
        // Also listen in case it finalizes a moment later
        const sub = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
            setCanReset(true);
          }
          setChecking(false);
        });
        unsub = sub.data.subscription.unsubscribe;
      }
    })();
    return () => unsub?.();
  }, []);

  const updatePassword = async () => {
    if (!newPass || newPass.length < 6) {
      notifications.show({
        color: "red",
        title: "Password too short",
        message: "Use at least 6 characters.",
      });
      return;
    }
    if (newPass !== newPass2) {
      notifications.show({
        color: "red",
        title: "Passwords do not match",
        message: "Please re-enter the same password.",
      });
      return;
    }
    try {
      setBusy(true);
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      notifications.show({
        color: "green",
        title: "Password updated",
        message: "You can now sign in with your new password.",
      });
      // Send to your normal entry page (or admin/member — up to you)
      window.location.replace("/");
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Could not update password",
        message: e.message || "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%)" }}>
      <AppShell header={{ height: 64 }} padding="md">
        <AppShell.Header>
          <Group h={64} px="md" justify="space-between">
            <Title order={4}>Job Link Task Manager</Title>
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <div style={{ minHeight: "calc(100vh - 64px)" }}>
            <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
              <Paper withBorder p="xl" radius="lg" style={{ width: "92vw", maxWidth: 500 }}>
                <Title order={3} mb="xs">Reset your password</Title>
                <Text c="dimmed" size="sm" mb="md">
                  Enter a new password for your account.
                </Text>

                <Divider mb="md" />

                {checking ? (
                  <Text c="dimmed">Validating your reset link…</Text>
                ) : canReset ? (
                  <>
                    <PasswordInput
                      label="New password"
                      placeholder="min 6 characters"
                      value={newPass}
                      onChange={(e) => setNewPass(e.currentTarget.value)}
                      mb="sm"
                    />
                    <PasswordInput
                      label="Confirm new password"
                      placeholder="repeat password"
                      value={newPass2}
                      onChange={(e) => setNewPass2(e.currentTarget.value)}
                    />
                    <Button fullWidth mt="md" loading={busy} onClick={updatePassword}>
                      Update password
                    </Button>
                  </>
                ) : (
                  <>
                    <Text mb="md" c="red">
                      Reset link is invalid or expired.
                    </Text>
                    <Button onClick={() => (window.location.href = "/")}>Go to sign in</Button>
                  </>
                )}
              </Paper>
            </div>
          </div>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}
