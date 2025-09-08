// import React, { useEffect, useState } from "react";
// import { supabase } from "./supabaseClient";
// import {
//   Center, Paper, TextInput, PasswordInput, Button, Group, Tabs, Text,
//   Divider, Badge, Anchor, Title, Stack, Alert, Box
// } from "@mantine/core";
// import { IconAlertCircle } from "@tabler/icons-react";
// import { notifications } from "@mantine/notifications";

// export default function AuthScreen({ onSignedIn }) {
//   const [tab, setTab] = useState("signin"); // signin | register | magic
//   const [email, setEmail] = useState("");
//   const [pass, setPass] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [errorMsg, setErrorMsg] = useState("");

//   // password reset mode
//   const [mode, setMode] = useState("auth"); // auth | reset
//   const [newPass, setNewPass] = useState("");
//   const [newPass2, setNewPass2] = useState("");

//   useEffect(() => {
//     // check URL for recovery
//     const url = new URL(window.location.href);
//     const queryType = url.searchParams.get("type");
//     if (queryType === "recovery") setMode("reset");

//     // surface OAuth errors nicely then clean URL
//     if (url.searchParams.get("error")) {
//       const desc =
//         url.searchParams.get("error_description") ||
//         url.searchParams.get("error");
//       notifications.show({
//         color: "red",
//         title: "Sign-in error",
//         message: decodeURIComponent(desc),
//       });
//       url.search = "";
//       window.history.replaceState({}, "", url.toString());
//     }

//     const { data: sub } = supabase.auth.onAuthStateChange((event) => {
//       if (event === "PASSWORD_RECOVERY") setMode("reset");
//       if (event === "SIGNED_IN" && typeof onSignedIn === "function") {
//         onSignedIn();
//       }
//     });
//     return () => sub?.subscription?.unsubscribe();
//   }, [onSignedIn]);

//   // actions
//   const signIn = async () => {
//     setErrorMsg(""); setLoading(true);
//     const { error } = await supabase.auth.signInWithPassword({
//       email, password: pass,
//     });
//     setLoading(false);
//     if (error) setErrorMsg(error.message);
//     else onSignedIn?.();
//   };

//   const register = async () => {
//     setErrorMsg(""); setLoading(true);
//     const { error } = await supabase.auth.signUp({
//       email, password: pass,
//       options: { emailRedirectTo: window.location.origin },
//     });
//     setLoading(false);
//     if (error) setErrorMsg(error.message);
//     else notifications.show({
//       color: "green",
//       title: "Confirm your email",
//       message: "We sent you a confirmation link.",
//     });
//   };

//   const sendMagic = async () => {
//     if (!email) return setErrorMsg("Enter your email first.");
//     setErrorMsg(""); setLoading(true);
//     const { error } = await supabase.auth.signInWithOtp({
//       email,
//       options: { emailRedirectTo: window.location.origin },
//     });
//     setLoading(false);
//     if (error) setErrorMsg(error.message);
//     else notifications.show({
//       color: "green",
//       title: "Magic link sent",
//       message: "Open your email and click the link.",
//     });
//   };

//   const google = async () => {
//     setErrorMsg("");
//     const { error } = await supabase.auth.signInWithOAuth({
//       provider: "google",
//       options: {
//         redirectTo: window.location.origin, // must be in Supabase "Additional Redirect URLs"
//         queryParams: { access_type: "offline", prompt: "consent" },
//       },
//     });
//     if (error) setErrorMsg(error.message);
//   };

//   const forgotPassword = async () => {
//     if (!email) return setErrorMsg("Enter your email to reset password.");
//     setErrorMsg(""); setLoading(true);
//     const { error } = await supabase.auth.resetPasswordForEmail(email, {
//       redirectTo: `${window.location.origin}?type=recovery`,
//     });
//     setLoading(false);
//     if (error) setErrorMsg(error.message);
//     else notifications.show({
//       color: "green",
//       title: "Email sent",
//       message: "Use the link to set a new password.",
//     });
//   };

//   const setNewPassword = async () => {
//     if (!newPass || newPass.length < 6)
//       return setErrorMsg("Password must be at least 6 characters.");
//     if (newPass !== newPass2)
//       return setErrorMsg("Passwords do not match.");
//     setErrorMsg(""); setLoading(true);
//     const { error } = await supabase.auth.updateUser({ password: newPass });
//     setLoading(false);
//     if (error) setErrorMsg(error.message);
//     else {
//       notifications.show({
//         color: "green",
//         title: "Password updated",
//         message: "Please sign in with your new password.",
//       });
//       setMode("auth"); setTab("signin");
//       const url = new URL(window.location.href);
//       url.search = "";
//       window.history.replaceState({}, "", url.toString());
//     }
//   };

//   const Card = ({ children }) => (
//     <Paper
//       shadow="xl"
//       radius="lg"
//       p="lg"
//       withBorder
//       style={{
//         width: "min(440px, 92vw)",
//         backdropFilter: "blur(8px)",
//         background:
//           "linear-gradient(135deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.78) 100%)",
//         borderColor: "rgba(0,0,0,0.06)",
//       }}
//     >
//       {children}
//     </Paper>
//   );

//   return (
//     <Box
//       style={{
//         minHeight: "100vh",
//         background:
//           "radial-gradient(1200px 600px at -10% -20%, #c7d2fe 0%, rgba(199,210,254,0) 60%)," +
//           "radial-gradient(1000px 500px at 120% 120%, #a7f3d0 0%, rgba(167,243,208,0) 60%)," +
//           "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
//       }}
//     >
//       <Center mih="100vh">
//         <Card>
//           <Stack gap="xs" mb="sm" align="center">
//             <Title order={3}>Welcome back</Title>
//             <Badge variant="light" color="indigo">Job Link Task Manager</Badge>
//           </Stack>

//           {errorMsg && (
//             <Alert icon={<IconAlertCircle size={18} />} color="red" variant="light" mb="sm">
//               {errorMsg}
//             </Alert>
//           )}

//           {/* Reset password mode */}
//           {mode === "reset" ? (
//             <Stack>
//               <Text c="dimmed" size="sm">Set a new password for your account.</Text>
//               <PasswordInput label="New password" value={newPass} onChange={(e)=>setNewPass(e.currentTarget.value)} required />
//               <PasswordInput label="Repeat password" value={newPass2} onChange={(e)=>setNewPass2(e.currentTarget.value)} required />
//               <Group justify="apart" mt="xs">
//                 <Button variant="default" onClick={()=>setMode("auth")}>Back</Button>
//                 <Button loading={loading} onClick={setNewPassword}>Update password</Button>
//               </Group>
//             </Stack>
//           ) : (
//             <>
//               <Button fullWidth variant="light" onClick={google}>
//                 Continue with Google
//               </Button>

//               <Divider my="md" label="or use email" />

//               <Tabs value={tab} onChange={setTab} keepMounted={false}>
//                 <Tabs.List grow>
//                   <Tabs.Tab value="signin">Sign in</Tabs.Tab>
//                   <Tabs.Tab value="register">Register</Tabs.Tab>
//                   <Tabs.Tab value="magic">Magic link</Tabs.Tab>
//                 </Tabs.List>

//                 <Tabs.Panel value="signin" pt="md">
//                   <Stack>
//                     <TextInput label="Email" type="email" value={email} onChange={(e)=>setEmail(e.currentTarget.value)} required />
//                     <PasswordInput label="Password" value={pass} onChange={(e)=>setPass(e.currentTarget.value)} required />
//                     <Group justify="space-between">
//                       <Anchor size="sm" onClick={forgotPassword}>Forgot password?</Anchor>
//                       <Button loading={loading} onClick={signIn}>Sign in</Button>
//                     </Group>
//                   </Stack>
//                 </Tabs.Panel>

//                 <Tabs.Panel value="register" pt="md">
//                   <Stack>
//                     <TextInput label="Email" type="email" value={email} onChange={(e)=>setEmail(e.currentTarget.value)} required />
//                     <PasswordInput label="Password" value={pass} onChange={(e)=>setPass(e.currentTarget.value)} required />
//                     <Group justify="end">
//                       <Button loading={loading} onClick={register}>Create account</Button>
//                     </Group>
//                   </Stack>
//                 </Tabs.Panel>

//                 <Tabs.Panel value="magic" pt="md">
//                   <Stack>
//                     <TextInput label="Email" type="email" value={email} onChange={(e)=>setEmail(e.currentTarget.value)} required />
//                     <Group justify="end">
//                       <Button loading={loading} onClick={sendMagic}>Send magic link</Button>
//                     </Group>
//                     <Text size="xs" c="dimmed">We’ll email you a one-click sign-in link.</Text>
//                   </Stack>
//                 </Tabs.Panel>
//               </Tabs>
//             </>
//           )}
//         </Card>
//       </Center>
//     </Box>
//   );
// }
