import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { onAuthStateChanged } from "firebase/auth";
import { signInWithFirebase, signOutFromFirebase, signUpWithFirebase } from "./src/firebase/auth";
import { auth, db } from "./src/firebase/config";
import { addDoc, collection, doc, increment, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { getRequestsForProvider, updateProviderRequestStatus, updateWorkerLocation } from "./src/firebase/providerRequests";
import { getNotificationsForUser, markNotificationsRead } from "./src/firebase/notifications";
import {
  cancelCustomerRequest,
  createServiceRequest,
  getLatestOngoingRequest,
  getRequestsForCustomer,
  getReviewsForProvider,
  saveRequestReview,
  updateCustomerRequestSchedule,
  attachProofToRequest
} from "./src/firebase/requests";
import {
  ensureUserProfile,
  getProvidersByService,
  SPECIAL_WORKER_EMAIL,
  SPECIAL_WORKER_UID,
  updateUserProfile,
  deleteUserAccount,
  addReviewToProvider
} from "./src/firebase/users";
import { getInlineImageData, getInlineProfileImageData } from "./src/firebase/storage";

const serveaseLogo = require("./ServEase Logo.png");

const theme = {
  blue: "#1677b8",
  blueDark: "#0b4f7f",
  blueSoft: "#e8f4ff",
  blueTint: "#f3f9ff",
  yellow: "#f7c51e",
  text: "#17212b",
  muted: "#687684",
  surface: "#ffffff",
  bg: "#f6f8fb",
  border: "#dce5ee",
  cardBorder: "#e1e8ef",
  success: "#21a85b",
  danger: "#d94a4a",
  navy: "#0d314f"
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAX_PROOF_INLINE_BYTES = 850000;

const serviceShortcuts = [
  {
    key: "plumbing",
    label: "Plumbing",
    icon: "water-outline",
    detail: "Plumbing Services",
    statusTitle: "Service Request Status",
    providers: [
      { name: "Juan Dela Cruz", reviewsName: "M******" },
      { name: "Jose Rizal", reviewsName: "L***" },
      { name: "Paul Likat", reviewsName: "M***" }
    ]
  },
  {
    key: "electrical",
    label: "Electrical",
    icon: "flash-outline",
    detail: "Electrical Services",
    statusTitle: "Service Request Status",
    providers: [
      { name: "Jojo Siwa", reviewsName: "A******" },
      { name: "Ran Dom", reviewsName: "J***" },
      { name: "Por Real", reviewsName: "S***" }
    ]
  },
  {
    key: "cctv",
    label: "CCTV\nInstall",
    icon: "videocam-outline",
    detail: "CCTV Installation",
    statusTitle: "Service Request Status",
    providers: [
      { name: "Bruno Mario", reviewsName: "P******" },
      { name: "Susmar Yusef", reviewsName: "H***" },
      { name: "Eman Nada", reviewsName: "R***" }
    ]
  },
  {
    key: "solar",
    label: "Solar Panel\nInstall",
    icon: "sunny-outline",
    detail: "Solar Panel Installation",
    statusTitle: "Service Request Status",
    providers: [
      { name: "Cardo Dalisay", reviewsName: "N******" },
      { name: "Yor Meh", reviewsName: "B***" },
      { name: "Dos Tres", reviewsName: "T***" }
    ]
  }
];

const featuredImages = {
  hero: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  worker:
    "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80",
  formBg:
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
  proof:
    "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1200&q=80"
};

const formFields = [
  { key: "name", label: "NAME:", placeholder: "EX. ROSE TITANIC" },
  { key: "number", label: "NUMBER:", placeholder: "EX. 0987 654 3210" },
  { key: "date", label: "DATE:", placeholder: "EX. FEBRUARY 20, 2026", icon: "calendar-outline" },
  { key: "time", label: "TIME:", placeholder: "EX. 2:30 PM", icon: "time-outline" },
  { key: "location", label: "LOCATION:", placeholder: "EX. BRGY. 14 (POB.), BATANGAS...", icon: "location-outline" },
  { key: "landmark", label: "LANDMARK:", placeholder: "EX. APARTMENT, UNIT NO. BAY CITY..." }
];

const providerBio =
  "No Bio";

const providerSkills = [
  "Pipe installation and repair",
  "Leak detection and troubleshooting",
  "Drain cleaning and unclogging",
  "Installation of fixtures",
  "Water supply line maintenance"
];

const providerStrengths = [
  "Strong work ethic and time management",
  "Problem-solving and customer communication",
  "Working under pressure and meeting deadlines",
  "Maintaining clean work areas"
];

const reviews = [
  "Juan Dela Cruz did an excellent job fixing our plumbing issue. He arrived on time, was very professional, and clearly explained the problem and solution.",
  "I'm very satisfied with the service provided. The work was neat and he even gave maintenance tips to avoid the same problem in the future."
];

const statusSteps = [
  { key: "requested", label: "Requested", date: "12/16/2025", time: "5:10pm" },
  { key: "accepted", label: "Accepted", date: "12/16/2025", time: "5:30pm" },
  { key: "on-the-way", label: "On the way", date: "12/16/2025", time: "9:45am" },
  { key: "started", label: "Started", date: "12/16/2025", time: "10:20am" },
  { key: "completed", label: "Completed", date: "12/16/2025", time: "11:25am" }
];

const offeredServiceContent = {
  plumbing: [
    { title: "Drain Cleaning and Unclogging", image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80" },
    { title: "Leak Detection and Repair", image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=900&q=80" },
    { title: "Fixture Installation and Repair", image: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=900&q=80" },
    { title: "Repiping and Pipe Repair", image: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=900&q=80" }
  ],
  electrical: [
    { title: "Wiring Installation and Repair", image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80" },
    { title: "Maintenance", image: "https://images.unsplash.com/photo-1581092160607-ee22731d8bd4?auto=format&fit=crop&w=900&q=80" },
    { title: "Emergency Services", image: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=900&q=80" }
  ],
  cctv: [
    { title: "Installation and Technical Setup", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80" },
    { title: "Pre-Installation and Consultation", image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=900&q=80" },
    { title: "Maintenance and Support", image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80" }
  ],
  solar: [
    { title: "Consultation and Site Assessment", image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=80" },
    { title: "Installation and Commissioning", image: "https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=900&q=80" },
    { title: "Maintenance and Repair", image: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=900&q=80" }
  ]
};

const emptyRequestForm = {
  name: "",
  number: "",
  date: "",
  time: "",
  location: "",
  landmark: "",
  concern: ""
};

const chatEnabledStatuses = ["accepted", "on-the-way", "started", "completed"];

function isChatEnabledForRequest(request) {
  return !!request?.id && chatEnabledStatuses.includes(request.status);
}

function getRequestTimestampValue(request) {
  return request?.updatedAt?.seconds || request?.createdAt?.seconds || 0;
}

function formatMessageTimestamp(ts) {
  if (!ts?.seconds) return "Sending...";
  return new Date(ts.seconds * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

const customerGuideSections = [
  {
    title: "1. Explore Services",
    items: [
      "Use the offered services shortcuts to browse Plumbing, Electrical, CCTV Installation, and Solar Panel Installation.",
      "Tap Create a Request when you are ready to book a worker for a specific problem."
    ]
  },
  {
    title: "2. Fill Out Your Request",
    items: [
      "Enter your name, contact number, preferred date and time, location, and a short description of the concern.",
      "Required fields must be completed before you can continue to the provider list."
    ]
  },
  {
    title: "3. Choose a Service Provider",
    items: [
      "Review available workers near your area, open their profile, and check their skills, work ethics, and customer reviews.",
      "Send your request once you are confident with the provider you selected."
    ]
  },
  {
    title: "4. Track Your Request",
    items: [
      "Open On-going Request to follow the current status of your booking from requested up to completed.",
      "You can reschedule before the worker is already on the way or has started the job."
    ]
  },
  {
    title: "5. Review and Proof",
    items: [
      "Once the service is completed, you can view the submitted proof photos from the worker.",
      "Leave a rating and review to help other customers choose the right provider."
    ]
  },
  {
    title: "Helpful Reminders",
    items: [
      "Keep your phone number and location accurate so the worker can reach you easily.",
      "Check notifications regularly for request updates, reschedules, and completion notices."
    ]
  }
];

function splitProfileList(value, fallbackItems = []) {
  const items = (value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : fallbackItems;
}

function formatFirestoreDate(ts) {
  if (!ts?.seconds) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatFirestoreTime(ts) {
  if (!ts?.seconds) return "";
  return new Date(ts.seconds * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function normalizeFirebaseError(error) {
  const code = error?.code || "";

  if (code.includes("invalid-credential")) return "Invalid email or password.";
  if (code.includes("email-already-in-use")) return "This email is already registered.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("invalid-email")) return "Please enter a valid email address.";
  if (code.includes("network-request-failed")) return "Network error. Please check your internet connection.";
  if (code.includes("missing-api-key")) return "Firebase is not configured yet. Please paste your Firebase config first.";

  return error?.message || "Something went wrong. Please try again.";
}

function LogoMark({ size = 128 }) {
  return <Image source={serveaseLogo} style={{ width: size, height: size }} resizeMode="contain" />;
}

function BrandBlock({ compact = false }) {
  return (
    <View style={styles.brandWrap}>
      <LogoMark size={compact ? 88 : 142} />
      <Text style={[styles.brandName, compact && styles.brandNameCompact]}>ServEase</Text>
      <Text style={styles.brandTag}>service made easy</Text>
    </View>
  );
}

function PrimaryButton({ title, onPress, style, textStyle, disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.primaryButton, style, disabled && styles.buttonDisabled, pressed && !disabled && styles.buttonPressed]}
    >
      <Text style={[styles.primaryButtonText, textStyle, disabled && styles.buttonDisabledText]}>{title}</Text>
    </Pressable>
  );
}

function IconCircleButton({ icon, onPress, badgeCount = 0 }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconCircleButton, pressed && styles.buttonPressed]}>
      <Ionicons name={icon} size={22} color={theme.navy} />
      {badgeCount > 0 ? (
        <View style={styles.headerBellBadge}>
          <Text style={styles.headerBellBadgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function EmptyState({ icon = "file-tray-outline", title, body }) {
  return (
    <View style={styles.emptyStateCard}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name={icon} size={24} color={theme.blueDark} />
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      {body ? <Text style={styles.emptyStateBody}>{body}</Text> : null}
    </View>
  );
}

function AuthCard({ title, fields, actionLabel, footerLeft, footerRight, onAction, onFooterRight, values, onChangeText, errorMessage, isLoading }) {
  return (
    <View style={styles.authCard}>
      <View style={styles.authHeader}>
        <Text style={styles.authHeaderText}>{title}</Text>
      </View>
      {fields.map((field) => (
        <View key={field.label} style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder=""
            value={values[field.key]}
            onChangeText={(text) => onChangeText(field.key, text)}
            autoCapitalize={field.autoCapitalize || "none"}
            secureTextEntry={field.secureTextEntry || false}
            keyboardType={field.keyboardType || "default"}
          />
        </View>
      ))}
      {errorMessage ? <Text style={styles.authErrorText}>{errorMessage}</Text> : null}
      <PrimaryButton title={isLoading ? "Please wait..." : actionLabel} onPress={onAction} style={styles.authButton} disabled={isLoading} />
      <View style={styles.authFooter}>
        <Text style={styles.authFooterText}>{footerLeft}</Text>
        <Pressable onPress={onFooterRight}>
          <Text style={[styles.authFooterText, styles.authFooterLink]}>{footerRight}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AnimatedPopup({ children, style }) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 85,
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, scale]);

  return <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>;
}

function StartScreen({ onNext }) {
  return (
    <View style={styles.startScreen}>
      <View style={{ flex: 1 }} />
      <BrandBlock />
      <View style={{ flex: 1 }} />
      <PrimaryButton title="Get Started" onPress={onNext} style={styles.getStartedButton} textStyle={styles.getStartedText} />
    </View>
  );
}

function SignInScreen({ onLogin, onGoSignUp, values, onChangeText, errorMessage, isLoading }) {
  return (
    <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.authScreen} keyboardShouldPersistTaps="handled">
        <BrandBlock compact />
        <AuthCard
          title="SIGN-IN"
          fields={[
            { key: "email", label: "Email Address:", keyboardType: "email-address" },
            { key: "password", label: "Password:", secureTextEntry: true }
          ]}
          actionLabel="LOGIN"
          footerLeft="Forgot Password"
          footerRight="NO ACCOUNT? SIGN-UP"
          onAction={onLogin}
          onFooterRight={onGoSignUp}
          values={values}
          onChangeText={onChangeText}
          errorMessage={errorMessage}
          isLoading={isLoading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SignUpScreen({ onSignUp, onGoSignIn, values, onChangeText, errorMessage, isLoading }) {
  return (
    <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.authScreen} keyboardShouldPersistTaps="handled">
        <BrandBlock compact />
        <AuthCard
          title="SIGN-UP"
          fields={[
            { key: "email", label: "Email Address:", keyboardType: "email-address" },
            { key: "password", label: "Password:", secureTextEntry: true },
            { key: "confirmPassword", label: "Confirm Password:", secureTextEntry: true }
          ]}
          actionLabel="SIGN-UP"
          footerLeft="HAVE AN ACCOUNT?"
          footerRight="SIGN-IN"
          onAction={onSignUp}
          onFooterRight={onGoSignIn}
          values={values}
          onChangeText={onChangeText}
          errorMessage={errorMessage}
          isLoading={isLoading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HeaderArea({ unreadCount = 0, chatUnreadCount = 0, onMenuPress, onBellPress, onChatPress, onGuidePress }) {
  return (
    <LinearGradient colors={["#082f4d", "#126da8", "#43a4d8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerArea}>
      <Image source={{ uri: featuredImages.hero }} style={styles.heroImage} />
      <View style={styles.headerOverlay} />
      <View style={styles.headerIcons}>
        <IconCircleButton icon="notifications-outline" onPress={onBellPress} badgeCount={unreadCount} />
        <IconCircleButton icon="chatbubble-ellipses-outline" onPress={onChatPress} badgeCount={chatUnreadCount} />
        <Pressable onPress={onMenuPress} style={({ pressed }) => [styles.iconCircleButton, pressed && styles.buttonPressed]}>
          <Feather name="menu" size={22} color={theme.navy} />
        </Pressable>
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.headerEyebrow}>ServEase</Text>
        <Text style={styles.headerTitle}>What can we fix today?</Text>
        <Text style={styles.headerSubtitle}>Book trusted home service workers near you.</Text>
      </View>
      <Pressable onPress={onGuidePress} style={styles.guidePill}>
        <Ionicons name="book-outline" size={18} color={theme.blueDark} />
        <Text style={styles.guideText}>Guide</Text>
      </Pressable>
    </LinearGradient>
  );
}

function FeaturedCarousel() {
  return (
    <View style={styles.featuredFrame}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredTrack}>
        <Image source={{ uri: featuredImages.worker }} style={styles.featureImage} />
        <Image source={{ uri: featuredImages.hero }} style={styles.featureImage} />
      </ScrollView>
      <View style={styles.paginationWrap}>
        <View style={styles.paginationDotInactive} />
        <View style={styles.paginationDotActive} />
      </View>
    </View>
  );
}

function ShortcutGrid({ onSelect }) {
  return (
    <View style={styles.shortcutsRow}>
      {serviceShortcuts.map((item) => (
        <Pressable key={item.key} style={styles.shortcutCard} onPress={() => onSelect(item.key)}>
          <View style={styles.shortcutIcon}>
            <Ionicons name={item.icon} size={28} color={theme.text} />
          </View>
          <Text style={styles.shortcutLabel}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ServiceList({ onSelect }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Create a Request</Text>
      {serviceShortcuts.map((item) => (
        <Pressable key={item.detail} style={({ pressed }) => [styles.serviceCard, pressed && styles.cardPressed]} onPress={() => onSelect(item.key)}>
          <View style={styles.serviceIconBox}>
            <Ionicons name={item.icon} size={28} color={theme.blueDark} />
          </View>
          <View style={styles.serviceCardBody}>
            <Text style={styles.serviceCardText}>{item.detail}</Text>
            <Text style={styles.serviceCardSub}>Start a booking request</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.muted} />
        </Pressable>
      ))}
    </View>
  );
}

function DashboardScreen({
  unreadCount = 0,
  chatUnreadCount = 0,
  showLocationModal = false,
  menuVisible = false,
  onEnableLocation,
  onLater,
  onOpenNotifications,
  onOpenMessages,
  onOpenService,
  onOpenOffer,
  onOpenHistory,
  onOpenOngoing,
  onOpenGuide,
  onMenuPress,
  onCloseMenu,
  onOpenProfile,
  onOpenAbout,
  onSignOut
}) {
  const menuSlide = useRef(new Animated.Value(220)).current;

  useEffect(() => {
    Animated.timing(menuSlide, {
      toValue: menuVisible ? 0 : 220,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [menuSlide, menuVisible]);

  return (
    <View style={styles.dashboardScreen}>
      <HeaderArea unreadCount={unreadCount} chatUnreadCount={chatUnreadCount} onBellPress={onOpenNotifications} onChatPress={onOpenMessages} onMenuPress={onMenuPress} onGuidePress={onOpenGuide} />
      <ScrollView contentContainerStyle={styles.dashboardContent}>
        <FeaturedCarousel />
        <Text style={styles.sectionTitle}>Offered Services</Text>
        <ShortcutGrid onSelect={onOpenOffer} />
        <ServiceList onSelect={onOpenService} />
        <Text style={[styles.sectionTitle, styles.historyTitle]}>Requests</Text>
        <View style={styles.quickActionGrid}>
          <Pressable style={({ pressed }) => [styles.quickActionCard, pressed && styles.cardPressed]} onPress={onOpenOngoing}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="time-outline" size={24} color={theme.blueDark} />
            </View>
            <Text style={styles.quickActionTitle}>On-going</Text>
            <Text style={styles.quickActionBody}>Track live status</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.quickActionCard, pressed && styles.cardPressed]} onPress={onOpenHistory}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="receipt-outline" size={24} color={theme.blueDark} />
            </View>
            <Text style={styles.quickActionTitle}>History</Text>
            <Text style={styles.quickActionBody}>Reviews and proof</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Modal transparent visible={showLocationModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalText}>Allow to access your location</Text>
            <PrimaryButton title="Enable Location Access" onPress={onEnableLocation} style={styles.modalButton} textStyle={styles.modalButtonText} />
            <PrimaryButton title="Later" onPress={onLater} style={[styles.modalButton, styles.modalButtonSecondary]} textStyle={styles.modalButtonText} />
          </View>
        </View>
      </Modal>
      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable style={styles.menuBackdrop} onPress={onCloseMenu}>
          <Animated.View style={[styles.menuPanel, { transform: [{ translateX: menuSlide }] }]}>
            <Pressable onPress={onOpenProfile}>
              <Text style={styles.menuItem}>My profile</Text>
            </Pressable>
            <Pressable onPress={onOpenAbout}>
              <Text style={styles.menuItem}>About us</Text>
            </Pressable>
            <Pressable onPress={onSignOut}>
              <Text style={styles.menuItem}>Sign out</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ServiceFormScreen({ service, onBack, onSubmit, values, onChangeText, errorMessage, onOpenDate, onOpenTime, onOpenMap }) {
  const requiredFields = new Set(["name", "number", "date", "time", "location", "concern"]);
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <View style={styles.serviceCardShell}>
          <View style={styles.serviceHeaderPill}>
            <View style={styles.serviceHeaderIconCircle}>
              <Ionicons name={service.icon} size={26} color={theme.blueDark} />
            </View>
            <Text style={styles.serviceHeaderTitle}>{service.detail}</Text>
          </View>

          <Pressable onPress={onBack} style={styles.formBackIcon}>
            <Ionicons name="arrow-back-circle-outline" size={28} color="#7c7c7c" />
          </Pressable>

          {formFields.map((field) => (
            <View key={field.label} style={styles.requestFieldWrap}>
              <Text style={styles.requestFieldLabel}>
                {field.label}
                {requiredFields.has(field.key) ? <Text style={styles.requiredAsterisk}> *</Text> : null}
              </Text>
              <View style={styles.requestInputWrap}>
                <TextInput
                  style={styles.requestInput}
                  placeholder={field.placeholder}
                  placeholderTextColor="#8d8d8d"
                  value={values[field.key]}
                  onChangeText={(text) => onChangeText(field.key, text)}
                />
                {field.key === "location" ? (
                  <Pressable onPress={onOpenMap} style={styles.pinButton}>
                    <Text style={styles.pinButtonText}>PIN MAP</Text>
                  </Pressable>
                ) : field.icon ? (
                  <Pressable onPress={field.key === "date" ? onOpenDate : field.key === "time" ? onOpenTime : undefined}>
                    <Ionicons name={field.icon} size={20} color="#7d7d7d" />
                  </Pressable>
                ) : null}
              </View>
              {field.key === "location" && values.coordinates ? (
                <Text style={{ fontSize: 10, color: '#2d8fdb', marginTop: 4, fontWeight: '700' }}>
                  Pinned location saved
                </Text>
              ) : null}
            </View>
          ))}

          <View style={styles.requestFieldWrap}>
            <Text style={styles.requestFieldLabel}>
              DESCRIBE YOUR CONCERN:
              <Text style={styles.requiredAsterisk}> *</Text>
            </Text>
            <TextInput
              style={[styles.requestInput, styles.concernInput]}
              multiline
              textAlignVertical="top"
              placeholder="EX: MY CONCERN IS..."
              placeholderTextColor="#8d8d8d"
              value={values.concern}
              onChangeText={(text) => onChangeText("concern", text)}
            />
          </View>

          {errorMessage ? <Text style={styles.formErrorText}>{errorMessage}</Text> : null}
          <PrimaryButton title="SUBMIT REQUEST" onPress={onSubmit} style={styles.submitButton} />
        </View>
      </ScrollView>
    </View>
  );
}

function StarRating({ size = 16, filled = 0 }) {
  return (
    <View style={styles.starRow}>
      {[0, 1, 2, 3, 4].map((item) => (
        <Ionicons key={item} name={item < filled ? "star" : "star-outline"} size={size} color={item < filled ? "#f4c319" : "#7f7f7f"} />
      ))}
    </View>
  );
}

function StarSelector({ value, onChange, size = 22 }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((item) => (
        <Pressable key={item} onPress={() => onChange(item)}>
          <Ionicons name={item <= value ? "star" : "star-outline"} size={size} color={item <= value ? "#f4c319" : "#7f7f7f"} />
        </Pressable>
      ))}
    </View>
  );
}

function ProviderCard({ provider, onViewProfile, onSendRequest }) {
  return (
    <View style={styles.providerRow}>
      <View style={styles.providerIdentity}>
        <View style={styles.providerAvatar}>
          {provider.photoURL ? (
            <Image 
              source={{ uri: provider.photoURL }} 
              style={{ width: 52, height: 52, borderRadius: 18 }} 
            />
          ) : (
            <Ionicons name="person-outline" size={34} color="#2e2e2e" />
          )}
        </View>
        <View style={styles.providerDetails}>
          <Text style={styles.providerName}>{provider.name}</Text>
          {/* Here is the updated real average rating fix! */}
          <StarRating filled={Math.round(provider.averageRating || 0)} />
        </View>
      </View>
      <View style={styles.providerActions}>
        <PrimaryButton title="View Profile" onPress={onViewProfile} style={styles.profileButton} textStyle={styles.providerButtonText} />
        <PrimaryButton title="Send Request" onPress={onSendRequest} style={styles.sendButton} textStyle={styles.providerButtonText} />
      </View>
    </View>
  );
}

function ProviderProfileModal({ provider, reviewsData, onClose, onProceed }) {
  const providerSkillItems = provider.skills ? splitProfileList(provider.skills, []) : [];
  const providerStrengthItems = provider.strengths ? splitProfileList(provider.strengths, []) : [];
  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.profileModalBackdrop}>
        <AnimatedPopup style={styles.profileModalCard}>
          <Pressable onPress={onClose} style={styles.profileCloseButton}>
            <Ionicons name="close-circle-outline" size={28} color="#1f1f1f" />
          </Pressable>
          {provider.photoURL ? (
            <Image source={{ uri: provider.photoURL }} style={styles.profileImageLarge} />
          ) : (
            <View style={styles.profileTopIcon}>
              <Ionicons name="person-outline" size={66} color="#2b2b2f" />
            </View>
          )}
          <Text style={styles.profileName}>{provider.name}</Text>
          <StarRating size={18} filled={Math.max(1, Math.round(provider.averageRating || 3))} />
          <Text style={styles.profileParagraph}>{provider.bio || providerBio}</Text>
          <Text style={styles.profileSectionTitle}>Skills</Text>
          {providerSkillItems.length ? providerSkillItems.map((skill) => (
            <Text key={`live-skill-${skill}`} style={styles.profileBullet}>- {skill}</Text>
          )) : <Text style={styles.profileBullet}>No skills added yet.</Text>}
          <Text style={styles.profileSectionTitle}>Strengths/Work Ethics</Text>
          {providerStrengthItems.length ? providerStrengthItems.map((item) => (
            <Text key={`live-strength-${item}`} style={styles.profileBullet}>- {item}</Text>
          )) : <Text style={styles.profileBullet}>No strengths added yet.</Text>}
          <Text style={styles.profileSectionTitle}>Customer Reviews:</Text>
          {reviewsData.length ? reviewsData.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Ionicons name="person-circle-outline" size={24} color="#2a2a2a" />
                <Text style={styles.reviewName}>{review.reviewerName}</Text>
                <StarRating size={14} filled={review.rating} />
              </View>
              <Text style={styles.reviewBody}>{review.text || "No review text."}</Text>
            </View>
          )) : <Text style={styles.profileBullet}>No reviews yet.</Text>}
          {false && (
            <>
          <Text style={styles.profileSectionTitle}>Skills</Text>
          {providerSkills.map((skill) => (
            <Text key={skill} style={styles.profileBullet}>• {skill}</Text>
          ))}
          <Text style={styles.profileSectionTitle}>Strengths/Work Ethics</Text>
          {providerStrengths.map((item) => (
            <Text key={item} style={styles.profileBullet}>• {item}</Text>
          ))}
          <Text style={styles.profileSectionTitle}>Customer Reviews:</Text>
          {reviews.map((review, index) => (
            <View key={index} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Ionicons name="person-circle-outline" size={24} color="#2a2a2a" />
                <Text style={styles.reviewName}>{index === 0 ? provider.reviewsName : "L***"}</Text>
                <StarRating size={14} />
              </View>
              <Text style={styles.reviewBody}>{review}</Text>
            </View>
          ))}
            </>
          )}
          <PrimaryButton title="PROCEED" onPress={onProceed} style={styles.proceedButton} />
        </AnimatedPopup>
      </View>
    </Modal>
  );
}

function RequestConfirmationModal({ provider, onCancel, onYes }) {
  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.profileModalBackdrop}>
        <AnimatedPopup style={styles.confirmModalCard}>
          <View style={styles.profileTopIconSmall}>
            <Ionicons name="person-outline" size={58} color="#2b2b2f" />
          </View>
          <Text style={styles.profileName}>{provider.name}</Text>
          <Text style={styles.confirmQuestion}>Are you sure you want to send a request?</Text>
          <View style={styles.confirmActionRow}>
            <PrimaryButton title="CANCEL" onPress={onCancel} style={styles.confirmButton} textStyle={styles.confirmButtonText} />
            <PrimaryButton title="YES" onPress={onYes} style={styles.confirmButton} textStyle={styles.confirmButtonText} />
          </View>
        </AnimatedPopup>
      </View>
    </Modal>
  );
}

function RequestSentModal({ provider, onProceed }) {
  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.profileModalBackdrop}>
        <AnimatedPopup style={styles.sentModalCard}>
          <View style={styles.profileTopIconSmall}>
            <Ionicons name="person-outline" size={58} color="#2b2b2f" />
          </View>
          <Text style={styles.profileName}>{provider.name}</Text>
          <Text style={styles.requestSentText}>Request Sent</Text>
          <PrimaryButton title="PROCEED" onPress={onProceed} style={styles.sentProceedButton} textStyle={styles.confirmButtonText} />
        </AnimatedPopup>
      </View>
    </Modal>
  );
}

function ProofPhotoGallery({ photos = [], imageStyle, emptyText, onRemovePhoto }) {
  if (!photos.length) {
    return emptyText ? <Text style={styles.providerEmptyText}>{emptyText}</Text> : null;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.proofGalleryRow}>
      {photos.map((photo, index) => (
        <View key={`${typeof photo === "string" ? photo : photo?.uri}-${index}`} style={styles.proofThumbWrap}>
          <Image source={{ uri: typeof photo === "string" ? photo : photo?.uri }} style={imageStyle || styles.proofGalleryImage} />
          {onRemovePhoto ? (
            <Pressable onPress={() => onRemovePhoto(index)} style={styles.proofRemoveButton}>
              <Ionicons name="close" size={16} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

function ProofPhotoViewerButton({
  photos = [],
  buttonLabel = "Pictures Proof",
  emptyText = "No proof photos uploaded yet.",
  title = "Proof of Service Photos"
}) {
  const [visible, setVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  if (!photos.length) {
    return emptyText ? <Text style={styles.providerEmptyText}>{emptyText}</Text> : null;
  }

  return (
    <>
      <PrimaryButton title={buttonLabel} onPress={() => setVisible(true)} style={styles.proofViewerButton} textStyle={styles.historyEntryButtonText} />
      <Modal transparent visible={visible} animationType="fade">
        <View style={[styles.profileModalBackdrop, styles.centeredModalBackdrop]}>
          <AnimatedPopup style={styles.proofViewerModalCard}>
            <Text style={styles.reviewFormTitle}>{title}</Text>
            <ScrollView contentContainerStyle={styles.proofViewerScroll}>
              {photos.map((photo, index) => (
                <Pressable
                  key={`${typeof photo === "string" ? photo : photo?.uri}-${index}`}
                  onPress={() => setSelectedPhoto(typeof photo === "string" ? photo : photo?.uri)}
                >
                  <Image
                    source={{ uri: typeof photo === "string" ? photo : photo?.uri }}
                    style={styles.proofViewerImage}
                    resizeMode="contain"
                  />
                </Pressable>
              ))}
            </ScrollView>
            <PrimaryButton title="Close" onPress={() => setVisible(false)} style={[styles.equalActionButton, styles.equalActionButtonSecondary]} textStyle={styles.historyEntryButtonText} />
          </AnimatedPopup>
        </View>
      </Modal>
      <Modal transparent visible={!!selectedPhoto} animationType="fade">
        <View style={styles.fullscreenProofBackdrop}>
          <Pressable style={styles.fullscreenProofClose} onPress={() => setSelectedPhoto(null)}>
            <Ionicons name="close-circle" size={34} color="#fff" />
          </Pressable>
          {selectedPhoto ? <Image source={{ uri: selectedPhoto }} style={styles.fullscreenProofImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </>
  );
}

function CompletionProofModal({ visible, photos, errorMessage, onPickPhotos, onRemovePhoto, onClose, onSubmit, isSubmitting }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.profileModalBackdrop}>
        <AnimatedPopup style={styles.completionModalCard}>
          <Text style={styles.reviewFormTitle}>Proof of Service</Text>
          <Text style={styles.reviewPostedText}>Upload up to 3 finished-work photos before marking this request as completed.</Text>
          <ProofPhotoGallery photos={photos} imageStyle={styles.completionPreviewImage} emptyText="No proof photos selected yet." onRemovePhoto={onRemovePhoto} />
          {errorMessage ? <Text style={styles.completionErrorText}>{errorMessage}</Text> : null}
          <View style={styles.equalButtonColumn}>
            <PrimaryButton title="Pick Photos" onPress={onPickPhotos} style={styles.equalActionButton} textStyle={styles.historyEntryButtonText} />
            <PrimaryButton
              title={isSubmitting ? "Uploading..." : "Upload and Mark Completed"}
              onPress={onSubmit}
              style={styles.equalActionButton}
              textStyle={styles.historyEntryButtonText}
              disabled={isSubmitting || photos.length === 0}
            />
            <PrimaryButton title="Close" onPress={onClose} style={[styles.equalActionButton, styles.equalActionButtonSecondary]} textStyle={styles.historyEntryButtonText} disabled={isSubmitting} />
          </View>
        </AnimatedPopup>
      </View>
    </Modal>
  );
}
function PaymentCheckoutModal({ visible, request, onClose, onPay, processing, success }) {
  const [selectedMethod, setSelectedMethod] = useState("online");
  const mockPrice = request?.serviceKey === "solar" ? "15,000.00" : "1,500.00";

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.paymentBackdrop}>
        <View style={styles.paymentSheet}>
          {success ? (
            <View style={styles.paymentSuccessContent}>
              <Ionicons name="checkmark-circle" size={72} color={theme.success} />
              <Text style={styles.paymentSuccessTitle}>{selectedMethod === "cash" ? "Cash Selected" : "Payment Successful!"}</Text>
              <Text style={styles.paymentSuccessText}>
                {selectedMethod === "cash" 
                  ? "Please hand the cash to your worker. They will confirm receipt on their app." 
                  : `₱${mockPrice} has been sent to ${request?.providerName}.`}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.paymentHeaderRow}>
                <Text style={styles.paymentTitle}>Checkout</Text>
                <Pressable onPress={onClose} disabled={processing}>
                  <Ionicons name="close-circle" size={28} color="#999" />
                </Pressable>
              </View>

              <View style={styles.paymentSummaryCard}>
                <Text style={styles.paymentSummaryLabel}>Total Amount Due</Text>
                <Text style={styles.paymentSummaryAmount}>₱{mockPrice}</Text>
                <Text style={styles.paymentSummaryDetail}>{request?.serviceLabel} by {request?.providerName}</Text>
              </View>

              <Text style={styles.paymentMethodLabel}>Select Payment Method</Text>

              <Pressable style={styles.paymentMethodCard} onPress={() => setSelectedMethod("online")}>
                <View style={[styles.paymentMethodIconBox, { backgroundColor: '#0054E3' }]}>
                  <Ionicons name="wallet" size={20} color="#fff" />
                </View>
                <Text style={styles.paymentMethodText}>GCash / Online</Text>
                <Ionicons name={selectedMethod === "online" ? "radio-button-on" : "radio-button-off"} size={20} color={selectedMethod === "online" ? theme.blue : "#ccc"} />
              </Pressable>

              <Pressable style={styles.paymentMethodCard} onPress={() => setSelectedMethod("cash")}>
                <View style={[styles.paymentMethodIconBox, { backgroundColor: '#21a85b' }]}>
                  <Ionicons name="cash" size={20} color="#fff" />
                </View>
                <Text style={styles.paymentMethodText}>Cash on Hand</Text>
                <Ionicons name={selectedMethod === "cash" ? "radio-button-on" : "radio-button-off"} size={20} color={selectedMethod === "cash" ? theme.blue : "#ccc"} />
              </Pressable>

              <PrimaryButton 
                title={processing ? "Processing..." : selectedMethod === "cash" ? "Pay with Cash" : `Pay ₱${mockPrice} Online`} 
                onPress={() => onPay(selectedMethod)} 
                style={styles.paymentConfirmButton} 
                disabled={processing}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
function ProviderListScreen({
  service,
  providers,
  loading,
  onBack,
  onCancel,
  onViewProfile,
  onSendRequest,
  selectedProvider,
  showProfile,
  providerProfileReviews,
  closeOverlay,
  confirmRequest
}) {
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.providerScroll}>
        <View style={styles.providerShell}>
          <View style={styles.providerTitleBar}>
            <Text style={styles.providerTitleBarText}>Service Providers</Text>
          </View>
          <Text style={styles.providerIntro}>These are the available service providers near your area.</Text>
          {loading ? <Text style={styles.providerEmptyText}>Loading providers...</Text> : null}
          {!loading && providers.length === 0 ? (
            <Text style={styles.providerEmptyText}>No worker accounts are available yet for {service.detail.toLowerCase()}.</Text>
          ) : null}
          {providers.map((provider) => (
            <ProviderCard
              key={provider.name}
              provider={provider}
              onViewProfile={() => onViewProfile(provider)}
              onSendRequest={() => onSendRequest(provider)}
            />
          ))}
          <PrimaryButton title="CANCEL" onPress={onCancel} style={styles.cancelButton} />
        </View>
      </ScrollView>
      <Pressable onPress={onBack} style={styles.providerBackButton}>
        <Ionicons name="arrow-back-circle-outline" size={28} color="#ffffff" />
      </Pressable>
      {showProfile && selectedProvider ? <ProviderProfileModal provider={selectedProvider} reviewsData={providerProfileReviews} onClose={closeOverlay} onProceed={closeOverlay} /> : null}
    </View>
  );
}

function StatusHeader({ service }) {
  return (
    <View style={styles.statusHeaderPill}>
      <View style={styles.serviceHeaderIconCircle}>
        <Ionicons name={service.icon} size={24} color={theme.blueDark} />
      </View>
      <Text style={styles.serviceHeaderTitle}>{service.statusTitle}</Text>
    </View>
  );
}

function TimelineStep({ item, active, completed }) {
  const stepStamp = item.timestamp || null;
  const stepDate = formatFirestoreDate(stepStamp);
  const stepTime = formatFirestoreTime(stepStamp);
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, active && styles.timelineDotActive, completed && styles.timelineDotCompleted]} />
        {item.key !== "completed" ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineTextWrap}>
        <Text style={[styles.timelineLabel, active && styles.timelineLabelActive, completed && styles.timelineLabelCompleted]}>{item.label}</Text>
        {stepDate || stepTime ? (
          <>
            {stepDate ? <Text style={styles.timelineMeta}>{stepDate}</Text> : null}
            {stepTime ? <Text style={styles.timelineMeta}>{stepTime}</Text> : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

function RequestStatusScreen({
  service,
  provider,
  activeStep,
  request,
  onBack,
  onAdvance,
  onProof,
  onLeaveReview,
  onReschedule,
  onCancel,
  onDone,
  onOpenChat,
  onOpenPayment
}) {
  const currentIndex = statusSteps.findIndex((step) => step.key === activeStep);
  const disableCancel = ["completed", "cancelled", "on-the-way", "started"].includes(activeStep);
  const displayProviderName = request?.providerName || provider?.name || "Service Provider";
  const stampedSteps = statusSteps.map((step) => ({
    ...step,
    timestamp:
      request?.statusHistory?.[step.key] ||
      (step.key === "requested" ? request?.createdAt : null) ||
      (step.key === activeStep ? request?.updatedAt : null)
  }));

  // --- NEW LIVE TRACKING LOGIC ---
  const [liveLocation, setLiveLocation] = useState(request?.workerLocation || null);
  const webViewRef = useRef(null);

  useEffect(() => {
    if (activeStep === "on-the-way" && request?.id) {
      // Create a live connection to this specific request in Firebase
      const requestRef = doc(db, "requests", request.id);
      const unsubscribe = onSnapshot(requestRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.workerLocation) {
            setLiveLocation(data.workerLocation);
            
            // Tell the map to move the pin smoothly without reloading the page
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                if (typeof marker !== 'undefined' && marker) {
                  var newLatLng = new L.LatLng(${data.workerLocation.latitude}, ${data.workerLocation.longitude});
                  marker.setLatLng(newLatLng);
                  map.panTo(newLatLng);
                }
                true;
              `);
            }
          }
        }
      });

      // Turn off the live connection if they leave the screen
      return () => unsubscribe();
    }
  }, [activeStep, request?.id]);
  // --- END LIVE TRACKING LOGIC ---

  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <StatusHeader service={service} />
        <View style={styles.statusCard}>
          <Pressable onPress={onBack} style={styles.statusBackButton}>
            <Ionicons name="arrow-back-circle-outline" size={28} color="#7c7c7c" />
          </Pressable>
          <View style={styles.statusAvatarBox}>
            <Ionicons name="person-outline" size={72} color="#2b2b2f" />
          </View>
          <Text style={styles.statusName}>{displayProviderName}</Text>
          <StarRating />

          {activeStep === "on-the-way" && liveLocation ? (
            <View style={{ height: 200, width: '100%', borderRadius: 10, overflow: 'hidden', marginTop: 10 }}>
              <WebView 
                ref={webViewRef}
                source={{ html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <style> body { padding: 0; margin: 0; } #map { height: 100vh; width: 100vw; } </style>
                  </head>
                  <body>
                      <div id="map"></div>
                      <script>
                          var map = L.map('map').setView([${liveLocation.latitude}, ${liveLocation.longitude}], 16);
                          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
                          var marker = L.marker([${liveLocation.latitude}, ${liveLocation.longitude}]).addTo(map).bindPopup("Your Worker is here!").openPopup();
                      </script>
                  </body>
                  </html>
                `}}
              />
            </View>
          ) : null}

          {activeStep !== "proof" ? (
            <>
              <View style={styles.statusActionRow}>
                <PrimaryButton title="Reschedule" onPress={onReschedule} style={styles.statusMiniButton} textStyle={styles.statusMiniText} disabled={activeStep === "completed" || activeStep === "cancelled"} />
                <PrimaryButton title="Cancel" onPress={onCancel} style={styles.statusMiniButton} textStyle={styles.statusMiniText} disabled={disableCancel} />
              </View>
              {isChatEnabledForRequest(request) ? (
                <PrimaryButton title="MESSAGE WORKER" onPress={() => onOpenChat?.(request)} style={styles.chatOpenButton} textStyle={styles.historyEntryButtonText} />
              ) : null}
              <View style={styles.timelineWrap}>
                {stampedSteps.map((item, index) => (
                  <TimelineStep
                    key={item.key}
                    item={item}
                    active={item.key === activeStep}
                    completed={index < currentIndex || activeStep === "completed"}
                  />
                ))}
              </View>

              {/* NEW PAYMENT LOGIC FOR 'STARTED' STEP */}
              {activeStep === "started" ? (
                <View style={{ marginTop: 16 }}>
                  {request?.paymentStatus === "paid" ? (
                    <Text style={{ textAlign: "center", color: theme.success, fontWeight: "800", marginBottom: 12 }}>Payment Verified! Worker is finishing up.</Text>
                  ) : request?.paymentMethod === "cash" ? (
                    <Text style={{ textAlign: "center", color: "#e68a00", fontWeight: "800", marginBottom: 12 }}>Waiting for worker to confirm cash receipt...</Text>
                  ) : (
                    <PrimaryButton title="PAY TO CONTINUE" onPress={() => onOpenPayment?.()} style={[styles.leaveReviewButton, { backgroundColor: theme.success }]} textStyle={styles.leaveReviewText} />
                  )}
                </View>
              ) : null}

              {/* REVIEW BUTTON FOR 'COMPLETED' STEP */}
              {activeStep === "completed" ? (
                <>
                  <ProofPhotoViewerButton photos={request?.proofPhotos || []} buttonLabel="Pictures Proof" title="Proof of Service" />
                  <PrimaryButton title="LEAVE A REVIEW" onPress={onLeaveReview} style={styles.leaveReviewButton} textStyle={styles.leaveReviewText} />
                </>
              ) : null}
              {activeStep === "cancelled" ? <Text style={styles.providerEmptyText}>This request has been cancelled.</Text> : null}
              <PrimaryButton title="DONE" onPress={onDone} style={styles.statusDoneButton} textStyle={styles.historyEntryButtonText} />
            </>
          ) : (
            <>
              <ProofPhotoViewerButton photos={request?.proofPhotos || []} buttonLabel="Pictures Proof" title="Proof of Service" />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function OfferedServicesScreen({ service, onBack }) {
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <View style={styles.offeredHeaderBar}>
          <View style={styles.offeredHeaderIcon}>
            <Ionicons name={service.icon} size={26} color={theme.text} />
          </View>
          <Text style={styles.offeredHeaderText}>{service.label.replace("\n", " ")}</Text>
        </View>
        <Pressable onPress={onBack} style={styles.formBackIcon}>
          <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
        </Pressable>
        {offeredServiceContent[service.key].map((item) => (
          <View key={item.title} style={styles.offeredCard}>
            <Image source={{ uri: item.image }} style={styles.offeredCardImage} />
            <Text style={styles.offeredCardTitle}>{item.title}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function HistoryEntry({ title, buttonTitle, onPress, request, isWorkerHistory = false }) {
  return (
    <View style={styles.historyEntryCard}>
      <Text style={styles.historyEntryTitle}>{title}</Text>
      <View style={styles.historyEntryInner}>
        <View style={styles.historyEntryTop}>
          <View style={styles.providerAvatarLarge}>
            <Ionicons name="person-outline" size={42} color="#2d2d2d" />
          </View>
          <View style={styles.historyProviderMeta}>
            <Text style={styles.historyProviderName}>{request.providerName || "Provider"}{"\n"}{request.serviceLabel || "Service"}</Text>
            <Text style={styles.historyProviderSmall}>{request.preferredDate || "-"}</Text>
            <Text style={[styles.historyProviderSmall, request.status === "completed" ? styles.historyComplete : null]}>{request.status || "-"}</Text>
            <Text style={styles.historyProviderSmall}>{request.preferredTime || "-"}</Text>
          </View>
        </View>
        <PrimaryButton title={buttonTitle} onPress={onPress} style={styles.historyEntryButton} textStyle={styles.historyEntryButtonText} />
        <ProofPhotoViewerButton
          photos={request?.proofPhotos || []}
          buttonLabel={isWorkerHistory ? "View Submitted Proof" : "Pictures Proof"}
          title="Proof of Service"
        />
      </View>
    </View>
  );
}

function HistoryScreen({ onBack, completedRequest, pendingReviewRequest, onViewMyReview, onLeaveReview, onOpenPayment }) {
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <Pressable onPress={onBack} style={styles.formBackIcon}>
          <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
        </Pressable>
        {completedRequest ? <HistoryEntry title="History" buttonTitle="View my Review" onPress={onViewMyReview} request={completedRequest} /> : null}
        
        {/* Updated logic: Check if paid. If not, show the Pay button instead! */}
        {pendingReviewRequest ? (
          <HistoryEntry 
            title="Pending Review" 
            buttonTitle={pendingReviewRequest.paymentStatus === "paid" ? "Leave a Review" : "Pay to Unlock Review"} 
            onPress={pendingReviewRequest.paymentStatus === "paid" ? onLeaveReview : onOpenPayment} 
            request={pendingReviewRequest} 
          />
        ) : null}

        {!completedRequest && !pendingReviewRequest ? <Text style={styles.providerEmptyText}>Empty history.</Text> : null}
      </ScrollView>
    </View>
  );
}

function OngoingRequestScreen({ onBack, onViewStatus, request }) {
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <Pressable onPress={onBack} style={styles.formBackIcon}>
          <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
        </Pressable>
        <View style={styles.ongoingCard}>
          <Text style={styles.ongoingCardTitle}>On-going Request</Text>
          <View style={styles.ongoingInner}>
            <View style={styles.providerAvatarXLarge}>
              <Ionicons name="person-outline" size={58} color="#2d2d2d" />
            </View>
            <Text style={styles.ongoingName}>{request?.providerName || "No assigned provider"}{"\n"}{request?.serviceLabel || "Service"}</Text>
            {request ? (
              <PrimaryButton title="View Request Status" onPress={onViewStatus} style={styles.ongoingStatusButton} textStyle={styles.historyEntryButtonText} />
            ) : (
              <Text style={styles.providerEmptyText}>No on-going request right now.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ReviewFormScreen({ onBack, onSubmit, reviewPostedVisible, onContinue, request, reviewForm, onChangeReview }) {
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <View style={styles.reviewFormCard}>
          <Pressable onPress={onBack} style={styles.statusBackButton}>
            <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
          </Pressable>
          <Text style={styles.reviewFormTitle}>Service Review</Text>
          <View style={styles.reviewServiceTop}>
            <View style={styles.providerAvatarLarge}>
              <Ionicons name="person-outline" size={42} color="#2d2d2d" />
            </View>
            <View style={styles.historyProviderMeta}>
              <Text style={styles.historyProviderName}>{request?.providerName || "Provider"}{"\n"}{request?.serviceLabel || "Service"}</Text>
              <Text style={styles.historyProviderSmall}>{request?.preferredDate || "-"}</Text>
              <Text style={[styles.historyProviderSmall, styles.historyComplete]}>{request?.status || "-"}</Text>
              <Text style={styles.historyProviderSmall}>{request?.preferredTime || "-"}</Text>
            </View>
          </View>
          <Text style={styles.reviewLabel}>Rate your Service Provider:</Text>
          <StarSelector value={reviewForm.rating} onChange={(value) => onChangeReview("rating", value)} />
          <View style={styles.reviewCheckboxRow}>
            <Pressable onPress={() => onChangeReview("anonymous", !reviewForm.anonymous)}>
              <Ionicons name={reviewForm.anonymous ? "checkmark-circle" : "ellipse-outline"} size={14} color="#555" />
            </Pressable>
            <Text style={styles.reviewCheckboxText}>Review Anonymously</Text>
          </View>
          <Text style={styles.reviewLabel}>Leave a Review:</Text>
          <TextInput
            multiline
            textAlignVertical="top"
            placeholder="EX: I gave 4 stars because..."
            placeholderTextColor="#8d8d8d"
            style={styles.reviewInput}
            value={reviewForm.reviewText}
            onChangeText={(text) => onChangeReview("reviewText", text)}
          />
          <PrimaryButton title="Submit" onPress={onSubmit} style={styles.reviewSubmitButton} textStyle={styles.historyEntryButtonText} />
        </View>
      </ScrollView>
      <Modal transparent visible={reviewPostedVisible} animationType="fade">
        <View style={styles.profileModalBackdrop}>
          <AnimatedPopup style={styles.reviewPostedCard}>
            <Text style={styles.reviewFormTitle}>Service Review</Text>
            <Text style={styles.reviewPostedText}>Review has been posted</Text>
            <PrimaryButton title="Continue" onPress={onContinue} style={styles.reviewPostedButton} textStyle={styles.historyEntryButtonText} />
          </AnimatedPopup>
        </View>
      </Modal>
    </View>
  );
}

function MyReviewScreen({ onBack, request }) {
  const reviewStars = request?.reviewRating || 0;
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <View style={styles.myReviewCard}>
          <Pressable onPress={onBack} style={styles.statusBackButton}>
            <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
          </Pressable>
          <View style={styles.reviewServiceTop}>
            <View style={styles.providerAvatarLarge}>
              <Ionicons name="person-outline" size={42} color="#2d2d2d" />
            </View>
            <View style={styles.historyProviderMeta}>
              <Text style={styles.historyProviderName}>{request?.providerName || "Provider"}{"\n"}{request?.serviceLabel || "Service"}</Text>
              <Text style={styles.historyProviderSmall}>{request?.preferredDate || "-"}</Text>
              <Text style={[styles.historyProviderSmall, styles.historyComplete]}>{request?.status || "-"}</Text>
              <Text style={styles.historyProviderSmall}>{request?.preferredTime || "-"}</Text>
            </View>
          </View>
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Ionicons name="person-circle-outline" size={24} color="#2a2a2a" />
              <Text style={styles.reviewName}>{request?.reviewAnonymous ? "Anonymous" : "You"}</Text>
              <StarRating size={14} filled={reviewStars} />
            </View>
            <Text style={styles.reviewBody}>
              {request?.reviewText || "No review yet."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function NamePromptModal({ visible, value, onChange, onSave }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.profileModalBackdrop}>
        <AnimatedPopup style={styles.confirmModalCard}>
          <Text style={styles.reviewFormTitle}>Set your name</Text>
          <Text style={styles.reviewPostedText}>Please add the name that should appear on your account.</Text>
          <TextInput style={styles.fieldInput} value={value} onChangeText={onChange} placeholder="Your full name" />
          <PrimaryButton title="Save Name" onPress={onSave} style={styles.reviewPostedButton} textStyle={styles.historyEntryButtonText} />
        </AnimatedPopup>
      </View>
    </Modal>
  );
}

function ProfileScreen({
  profile,
  isProvider,
  onBack,
  profileForm,
  onChange,
  onPickPhoto,
  onSave,
  onDeleteAccount,
  photoUploadLoading = false,
  uploadError = ""
}) {
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <Pressable onPress={onBack} style={styles.formBackIcon}>
          <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
        </Pressable>
        <View style={styles.workerPanel}>
          <Text style={styles.workerPanelTitle}>My Profile</Text>
          <View style={styles.profilePhotoWrap}>
            {profileForm.photoURL ? (
              <Image source={{ uri: profileForm.photoURL }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person-outline" size={68} color="#2d2d2d" />
              </View>
            )}
          </View>
          {!isProvider ? (
            <PrimaryButton
              title={photoUploadLoading ? "Uploading Photo..." : "Upload Profile Picture"}
              onPress={onPickPhoto}
              style={styles.workerActionButton}
              textStyle={styles.historyEntryButtonText}
              disabled={photoUploadLoading}
            />
          ) : (
            <Text style={styles.providerEmptyText}>Profile picture updates for workers are managed by the web developer.</Text>
          )}
          {!isProvider && uploadError ? <Text style={styles.formErrorText}>{uploadError}</Text> : null}
          <Text style={styles.requestFieldLabel}>NAME:</Text>
          <TextInput
            style={styles.fieldInput}
            value={profileForm.displayName}
            onChangeText={(text) => onChange("displayName", text)}
            editable={!isProvider}
            placeholder="Full name"
          />
          <Text style={styles.requestFieldLabel}>BIO:</Text>
          <TextInput
            style={styles.reviewInput}
            multiline
            textAlignVertical="top"
            value={profileForm.bio}
            onChangeText={(text) => onChange("bio", text)}
            placeholder="Tell people about yourself"
          />
          {isProvider ? (
            <>
              <Text style={styles.requestFieldLabel}>SKILLS:</Text>
              <TextInput
                style={styles.reviewInput}
                multiline
                textAlignVertical="top"
                value={profileForm.skills}
                onChangeText={(text) => onChange("skills", text)}
                placeholder={"One skill per line\nExample:\nPipe installation\nLeak repair"}
              />
              <Text style={styles.requestFieldLabel}>STRENGTHS / WORK ETHICS:</Text>
              <TextInput
                style={styles.reviewInput}
                multiline
                textAlignVertical="top"
                value={profileForm.strengths}
                onChangeText={(text) => onChange("strengths", text)}
                placeholder={"One strength per line\nExample:\nPunctual\nClean workmanship"}
              />
            </>
          ) : null}
          <PrimaryButton title="SAVE PROFILE" onPress={onSave} style={styles.workerActionButton} textStyle={styles.historyEntryButtonText} />
          {!isProvider ? (
            <PrimaryButton title="DELETE ACCOUNT" onPress={onDeleteAccount} style={styles.workerSecondaryButton} textStyle={styles.historyEntryButtonText} />
          ) : null}
          {isProvider ? <Text style={styles.providerEmptyText}>Workers can edit bio only. Name and picture changes are handled by the web developer.</Text> : null}
          {profile?.serviceTypes?.length ? (
            <Text style={styles.providerEmptyText}>Worker services: {profile.serviceTypes.join(", ")}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function NotificationScreen({ onBack, notifications, loading, onOpenRequest }) {
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <Pressable onPress={onBack} style={styles.formBackIcon}>
          <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
        </Pressable>
        <View style={styles.workerPanel}>
          <Text style={styles.workerPanelTitle}>Notifications</Text>
          <Text style={styles.workerPanelText}>
            {loading ? "Loading notifications..." : notifications.length ? "Tap a notification to open its request." : "No notifications yet."}
          </Text>
        </View>
        {notifications.map((item) => (
          <Pressable key={item.id} style={[styles.notificationCard, !item.read && styles.notificationCardUnread]} onPress={() => onOpenRequest(item)}>
            <View style={styles.notificationTop}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              {!item.read ? <View style={styles.notificationUnreadDot} /> : null}
            </View>
            <Text style={styles.notificationBody}>{item.body}</Text>
            <Text style={styles.notificationTime}>
              {formatFirestoreDate(item.createdAt)} {formatFirestoreTime(item.createdAt)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function CustomerGuideScreen({ onBack }) {
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.hero }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <Pressable onPress={onBack} style={styles.formBackIcon}>
          <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
        </Pressable>
        <View style={styles.workerPanel}>
          <Text style={styles.workerPanelTitle}>Customer Manual</Text>
          <Text style={styles.workerPanelText}>
            Welcome to ServEase. This quick guide shows how to request a service, follow its progress, and complete your review after the job is finished.
          </Text>
        </View>
        {customerGuideSections.map((section) => (
          <View key={section.title} style={styles.guideCard}>
            <Text style={styles.guideCardTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <Text key={item} style={styles.guideCardItem}>
                - {item}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const aboutTeamMembers = [
  { name: "Kim Harrie Abel", role: "Lead Full Stack Developer / System Architect" },
  { name: "Tricia Mae Bunyi", role: "Frontend Developer / Mobile UI Engineer" },
  { name: "Princess De Belen", role: "Backend Developer / Firebase Integration Engineer" },
  { name: "Janna Veronica De Torres", role: "QA Developer / Feature Testing Engineer" },
  { name: "Kimberly Helera", role: "Mobile Developer / Documentation Engineer" }
];

function AboutUsScreen({ onBack }) {
  return (
    <View style={styles.serviceScreen}>
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <Pressable onPress={onBack} style={styles.formBackIcon}>
          <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
        </Pressable>
        <View style={styles.workerPanel}>
          <Text style={styles.workerPanelTitle}>About ServEase</Text>
          <Text style={styles.workerPanelText}>
            ServEase is a mobile service-request application designed to connect customers with trusted home service workers for plumbing, electrical, CCTV installation, and solar panel installation needs.
          </Text>
          <Text style={styles.workerPanelText}>
            This application is the final project for the course Technopreneurship. It was built to demonstrate a practical technology-based service business concept with real-time booking, worker updates, messaging, proof of service, reviews, and location support.
          </Text>
        </View>
        <View style={styles.workerPanel}>
          <Text style={styles.workerPanelTitle}>Development Team</Text>
          {aboutTeamMembers.map((member) => (
            <View key={member.name} style={styles.aboutMemberCard}>
              <Text style={styles.aboutMemberName}>{member.name}</Text>
              <Text style={styles.aboutMemberRole}>{member.role}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ChatInboxScreen({ requests, threadSummaries, currentUser, isProvider, onBack, onOpenChat }) {
  const chatRequests = requests
    .filter(isChatEnabledForRequest)
    .sort((a, b) => {
      const aSummary = threadSummaries[a.id];
      const bSummary = threadSummaries[b.id];
      return (bSummary?.latestMessageAt?.seconds || getRequestTimestampValue(b)) - (aSummary?.latestMessageAt?.seconds || getRequestTimestampValue(a));
    });

  return (
    <View style={styles.serviceScreen}>
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <Pressable onPress={onBack} style={styles.formBackIcon}>
          <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
        </Pressable>
        <View style={styles.chatInboxHeader}>
          <Text style={styles.chatInboxTitle}>Messages</Text>
          <Text style={styles.chatInboxSub}>Chat becomes available after a request is accepted.</Text>
        </View>
        {chatRequests.length ? (
          chatRequests.map((request) => {
            const summary = threadSummaries[request.id] || {};
            const unreadCount = summary.unreadBy?.[currentUser?.uid] || 0;
            const displayName = isProvider ? request.customerName || "Customer" : request.providerName || "Worker";
            const latestText = summary.latestImage ? "Photo message" : summary.latestText;

            return (
              <Pressable key={request.id} style={({ pressed }) => [styles.chatThreadCard, pressed && styles.cardPressed]} onPress={() => onOpenChat(request)}>
                <View style={styles.chatThreadAvatar}>
                  <Ionicons name={isProvider ? "person-outline" : "construct-outline"} size={24} color={theme.blueDark} />
                </View>
                <View style={styles.chatThreadBody}>
                  <View style={styles.chatThreadTop}>
                    <Text style={styles.chatThreadName}>{displayName}</Text>
                    <Text style={styles.chatThreadTime}>{summary.latestMessageAt ? formatMessageTimestamp(summary.latestMessageAt) : request.status}</Text>
                  </View>
                  <Text style={styles.chatThreadPreview} numberOfLines={1}>
                    {latestText || `${request.serviceLabel || "Service"} request`}
                  </Text>
                </View>
                {unreadCount > 0 ? (
                  <View style={styles.chatUnreadBadge}>
                    <Text style={styles.chatUnreadText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        ) : (
          <EmptyState icon="chatbubble-ellipses-outline" title="No conversations yet" body="Accepted service requests will appear here automatically." />
        )}
      </ScrollView>
    </View>
  );
}

function ChatMessageBubble({ message, isMine }) {
  const status = message.seenAt ? "Seen" : "Sent";

  return (
    <View style={[styles.chatMessageRow, isMine ? styles.chatMessageRowMine : styles.chatMessageRowOther]}>
      <View style={[styles.chatBubble, isMine ? styles.chatBubbleMine : styles.chatBubbleOther]}>
        {message.imageUri ? <Image source={{ uri: message.imageUri }} style={styles.chatImage} /> : null}
        {message.text ? <Text style={[styles.chatBubbleText, isMine && styles.chatBubbleTextMine]}>{message.text}</Text> : null}
        <View style={styles.chatMetaRow}>
          <Text style={[styles.chatTimeText, isMine && styles.chatTimeTextMine]}>{formatMessageTimestamp(message.createdAt)}</Text>
          {isMine ? <Text style={styles.chatStatusText}>{status}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function ChatScreen({
  request,
  currentUser,
  isProvider,
  messages,
  typingState,
  chatText,
  imageSending,
  sending,
  onBack,
  onChangeText,
  onSend,
  onPickImage
}) {
  const listRef = useRef(null);
  const chatMessages = messages;
  const otherName = isProvider ? request?.customerName || "Customer" : request?.providerName || "Worker";
  const otherTyping = isProvider ? typingState?.customerTyping : typingState?.workerTyping;

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [chatMessages.length, otherTyping]);

  return (
    <KeyboardAvoidingView style={styles.chatScreen} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
      <View style={styles.chatHeader}>
        <Pressable onPress={onBack} style={styles.chatBackButton}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </Pressable>
        <View style={styles.chatHeaderAvatar}>
          <Ionicons name={isProvider ? "person-outline" : "construct-outline"} size={22} color={theme.blueDark} />
        </View>
        <View style={styles.chatHeaderTextWrap}>
          <Text style={styles.chatHeaderName}>{otherName}</Text>
          <Text style={styles.chatHeaderSub}>{request?.serviceLabel || "Service request"}</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={chatMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatMessageBubble message={item} isMine={item.senderId === currentUser?.uid} />}
        contentContainerStyle={styles.chatMessagesContent}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={18}
        maxToRenderPerBatch={12}
        windowSize={9}
        ListEmptyComponent={
          <EmptyState icon="chatbubbles-outline" title="Start the conversation" body="Send a message if the phone number cannot be reached." />
        }
        ListFooterComponent={
          otherTyping ? (
            <Animated.View style={styles.typingBubble}>
              <Text style={styles.typingText}>{isProvider ? "Customer is typing..." : "Worker is typing..."}</Text>
            </Animated.View>
          ) : null
        }
      />

      <View style={styles.chatComposerWrap}>
        <Pressable onPress={onPickImage} style={({ pressed }) => [styles.chatImageButton, pressed && styles.buttonPressed]} disabled={imageSending}>
          <Ionicons name={imageSending ? "hourglass-outline" : "image-outline"} size={22} color={theme.blueDark} />
        </Pressable>
        <TextInput
          style={styles.chatInput}
          value={chatText}
          onChangeText={onChangeText}
          placeholder="Type a message"
          placeholderTextColor="#8a98a6"
          multiline
        />
        <Pressable onPress={onSend} style={({ pressed }) => [styles.chatSendButton, (!chatText.trim() || sending) && styles.chatSendButtonDisabled, pressed && !sending && styles.buttonPressed]} disabled={!chatText.trim() || sending}>
          <Ionicons name={sending ? "hourglass-outline" : "send"} size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function ProviderDashboardScreen({ profile, requests, loading, chatUnreadCount = 0, onOpenRequests, onOpenHistory, onOpenMessages, onOpenProfile, onSignOut }) {
  const historyCount = requests.filter((item) => ["completed", "cancelled"].includes(item.status)).length;
  const activeCount = requests.filter((item) => !["completed", "cancelled"].includes(item.status)).length;
  const serviceSummary = (profile?.serviceTypes || [profile?.serviceType || "plumbing"]).filter(Boolean).join(", ");
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <View style={styles.workerHero}>
          <View style={styles.workerHeroTop}>
            <View>
              <Text style={styles.workerHeroEyebrow}>Worker Dashboard</Text>
              <Text style={styles.workerHeroTitle}>{profile?.displayName || "Provider"}</Text>
              <Text style={styles.workerHeroSub}>{profile?.email || SPECIAL_WORKER_EMAIL}</Text>
            </View>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.workerHeroAvatar} />
            ) : (
              <View style={styles.workerHeroAvatar}>
                <Ionicons name="person-outline" size={34} color={theme.blueDark} />
              </View>
            )}
          </View>
          <Text style={styles.workerBioText}>{profile?.bio || "No bio yet."}</Text>
          <View style={styles.liveStatusPill}>
            <View style={styles.liveStatusDot} />
            <Text style={styles.liveStatusText}>Request updates are live</Text>
          </View>
          <PrimaryButton
            title={chatUnreadCount > 0 ? `MESSAGES (${chatUnreadCount})` : "MESSAGES"}
            onPress={onOpenMessages}
            style={styles.workerActionButton}
            textStyle={styles.historyEntryButtonText}
          />
          <PrimaryButton title="MY PROFILE" onPress={onOpenProfile} style={styles.workerActionButton} textStyle={styles.historyEntryButtonText} />
        </View>

        <View style={styles.workerStatsRow}>
          <Pressable style={({ pressed }) => [styles.workerStatCard, pressed && styles.cardPressed]} onPress={onOpenRequests}>
            <Text style={styles.workerStatNumber}>{loading ? "-" : activeCount}</Text>
            <Text style={styles.workerStatLabel}>Active Jobs</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.workerStatCard, pressed && styles.cardPressed]} onPress={onOpenHistory}>
            <Text style={styles.workerStatNumber}>{loading ? "-" : historyCount}</Text>
            <Text style={styles.workerStatLabel}>History</Text>
          </Pressable>
        </View>

        <Pressable style={({ pressed }) => [styles.workerPanel, pressed && styles.cardPressed]} onPress={onOpenRequests}>
          <View style={styles.panelHeadingRow}>
            <Text style={styles.workerPanelTitle}>My Service Jobs</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.muted} />
          </View>
          <Text style={styles.workerPanelText}>
            {loading
              ? "Loading requests..."
              : `You currently have ${activeCount} active request(s) across: ${serviceSummary}.`}
          </Text>
          {!loading && activeCount === 0 ? <EmptyState icon="briefcase-outline" title="No active requests" body="New customer requests will appear here automatically." /> : null}
        </Pressable>

        <View style={styles.workerPanel}>
          <View style={styles.panelHeadingRow}>
          <Text style={styles.workerPanelTitle}>History</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.muted} />
          </View>
          <Text style={styles.workerPanelText}>
            {loading ? "Loading history..." : historyCount > 0 ? `You have ${historyCount} completed or cancelled request(s) in history.` : "Empty history."}
          </Text>
          {!loading && historyCount === 0 ? <EmptyState icon="archive-outline" title="No finished jobs" body="Completed and cancelled work will be collected here." /> : null}
          <PrimaryButton title="VIEW HISTORY" onPress={onOpenHistory} style={styles.workerActionButton} textStyle={styles.historyEntryButtonText} />
          <PrimaryButton title="SIGN OUT" onPress={onSignOut} style={styles.workerSecondaryButton} textStyle={styles.historyEntryButtonText} />
        </View>
      </ScrollView>
    </View>
  );
}

function ProviderRequestsScreen({ requests, loading, onBack, onOpenRequest }) {
  const activeRequests = requests.filter((item) => !["completed", "cancelled"].includes(item.status));
  const sections = [
    { key: "plumbing", title: "Plumbing" },
    { key: "electrical", title: "Electrical" },
    { key: "cctv", title: "CCTV Installation" },
    { key: "solar", title: "Solar Panel Installation" }
  ];

  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <Pressable onPress={onBack} style={styles.formBackIcon}>
          <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
        </Pressable>
        <View style={styles.workerPanel}>
          <View style={styles.panelHeadingRow}>
            <Text style={styles.workerPanelTitle}>My Service Jobs</Text>
            <Text style={styles.countBadge}>{loading ? "-" : activeRequests.length}</Text>
          </View>
          <Text style={styles.workerPanelText}>{loading ? "Loading..." : `${activeRequests.length} active request(s) found.`}</Text>
        </View>

        {sections.map((section) => {
          const sectionRequests = activeRequests.filter((item) => item.serviceKey === section.key);
          return (
            <View key={section.key} style={styles.workerPanel}>
              <View style={styles.panelHeadingRow}>
                <Text style={styles.workerPanelTitle}>{section.title}</Text>
                <Text style={styles.countBadge}>{sectionRequests.length}</Text>
              </View>
              {sectionRequests.length ? (
                sectionRequests.map((request) => (
                  <Pressable key={request.id} style={({ pressed }) => [styles.workerRequestCard, pressed && styles.cardPressed]} onPress={() => onOpenRequest(request)}>
                    <View style={styles.workerRequestTop}>
                      <Text style={styles.workerRequestName}>{request.customerName || "Unknown Customer"}</Text>
                      <Text style={styles.workerRequestBadge}>{request.status || "requested"}</Text>
                    </View>
                    <Text style={styles.workerRequestText}>{request.location || "No location"}</Text>
                    <Text style={styles.workerRequestText}>{request.concern || "No concern provided"}</Text>
                  </Pressable>
                ))
              ) : (
                <EmptyState icon="checkmark-done-outline" title="No active requests" body="This service is clear right now." />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ProviderHistoryScreen({ requests, loading, onBack, onOpenRequest }) {
  const historyRequests = requests.filter((item) => ["completed", "cancelled"].includes(item.status));

  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <Pressable onPress={onBack} style={styles.formBackIcon}>
          <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
        </Pressable>
        <View style={styles.workerPanel}>
          <View style={styles.panelHeadingRow}>
            <Text style={styles.workerPanelTitle}>History</Text>
            <Text style={styles.countBadge}>{loading ? "-" : historyRequests.length}</Text>
          </View>
          <Text style={styles.workerPanelText}>{loading ? "Loading..." : `${historyRequests.length} history request(s) found.`}</Text>
        </View>
        {historyRequests.map((request) => (
          <HistoryEntry key={request.id} title={request.serviceLabel || "History"} buttonTitle="View Details" onPress={() => onOpenRequest(request)} request={request} isWorkerHistory />
        ))}
        {!loading && historyRequests.length === 0 ? <EmptyState icon="archive-outline" title="Empty history" body="Completed and cancelled requests will show here automatically." /> : null}
      </ScrollView>
    </View>
  );
}

function ProviderRequestDetailScreen({ request, onBack, onUpdateStatus, onCancelRequest, onOpenChat, onConfirmCash }) {
  const [workerMapLocation, setWorkerMapLocation] = useState(request.workerLocation || null);
  const nextActionMap = {
    requested: "Accept Request",
    accepted: "Mark On The Way",
    "on-the-way": "Start Service",
    started: "Mark Completed",
    completed: "Completed"
  };

  useEffect(() => {
    if (request.workerLocation) {
      setWorkerMapLocation(request.workerLocation);
    }
  }, [request.workerLocation?.latitude, request.workerLocation?.longitude]);

  useEffect(() => {
    let locationSubscription = null;

    const startTracking = async () => {
      if (request.coordinates) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.error("Permission to access location was denied");
          return;
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (location) => {
            const nextLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            };
            setWorkerMapLocation(nextLocation);
            if (request.status === "on-the-way") {
              updateWorkerLocation(request.id, nextLocation.latitude, nextLocation.longitude)
                .catch(err => console.error("Error updating location:", err));
            }
          }
        );
      }
    };

    startTracking();

    // Clean up the watcher when the component unmounts or status changes
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [request.status, request.id, request.coordinates?.latitude, request.coordinates?.longitude]);

  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <Pressable onPress={onBack} style={styles.formBackIcon}>
          <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
        </Pressable>
        <View style={styles.workerPanel}>
          <Text style={styles.workerPanelTitle}>{request.customerName || "Customer Request"}</Text>
          <Text style={styles.workerDetailLabel}>Status</Text>
          <Text style={styles.workerDetailValue}>{request.status || "requested"}</Text>
          <Text style={styles.workerDetailLabel}>Phone</Text>
          <Text style={styles.workerDetailValue}>{request.phoneNumber || "-"}</Text>
          <Text style={styles.workerDetailLabel}>Location</Text>
          <Text style={styles.workerDetailValue}>{request.location || "-"}</Text>
          <Text style={styles.workerDetailLabel}>Landmark</Text>
          <Text style={styles.workerDetailValue}>{request.landmark || "-"}</Text>
          <Text style={styles.workerDetailLabel}>Preferred Schedule</Text>
          <Text style={styles.workerDetailValue}>{`${request.preferredDate || "-"} ${request.preferredTime || ""}`}</Text>
          <Text style={styles.workerDetailLabel}>Concern</Text>
          <Text style={styles.workerDetailValue}>{request.concern || "-"}</Text>
          {request.coordinates ? (
            <View style={{ height: 180, width: '100%', borderRadius: 8, overflow: 'hidden', marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: '#9aa6b1' }}>
              <WebView 
                source={{ html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <style>
                        body { padding: 0; margin: 0; font-family: Arial, sans-serif; }
                        #map { height: 100vh; width: 100vw; }
                        .route-note {
                          position: absolute;
                          left: 10px;
                          right: 10px;
                          bottom: 10px;
                          z-index: 500;
                          background: rgba(255,255,255,0.94);
                          border-radius: 10px;
                          padding: 8px 10px;
                          font-size: 12px;
                          color: #17212b;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
                        }
                      </style>
                  </head>
                  <body>
                      <div id="map"></div>
                      <div class="route-note" id="routeNote">${workerMapLocation ? "Route guidance from your current location to the customer pin." : "Waiting for your current location to draw route guidance."}</div>
                      <script>
                          var customerLat = ${request.coordinates.latitude};
                          var customerLng = ${request.coordinates.longitude};
                          var workerLat = ${workerMapLocation?.latitude || "null"};
                          var workerLng = ${workerMapLocation?.longitude || "null"};
                          var map = L.map('map').setView([workerLat || customerLat, workerLng || customerLng], 15);
                          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
                          var customerMarker = L.marker([customerLat, customerLng]).addTo(map).bindPopup("Customer's Pinned Location");
                          var points = [[customerLat, customerLng]];
                          if (workerLat && workerLng) {
                            var workerMarker = L.circleMarker([workerLat, workerLng], {
                              radius: 8,
                              color: '#0b4f7f',
                              fillColor: '#1677b8',
                              fillOpacity: 0.95
                            }).addTo(map).bindPopup("Your Current Location");
                            points.push([workerLat, workerLng]);
                            map.fitBounds(points, { padding: [28, 28] });
                            fetch('https://router.project-osrm.org/route/v1/driving/' + workerLng + ',' + workerLat + ';' + customerLng + ',' + customerLat + '?overview=full&geometries=geojson')
                              .then(function(response) { return response.json(); })
                              .then(function(data) {
                                var route = data && data.routes && data.routes[0];
                                if (!route) throw new Error('No route');
                                var routeCoords = route.geometry.coordinates.map(function(item) { return [item[1], item[0]]; });
                                L.polyline(routeCoords, { color: '#1677b8', weight: 5, opacity: 0.85 }).addTo(map);
                                document.getElementById('routeNote').innerText = 'Suggested road route to the customer pin.';
                              })
                              .catch(function() {
                                L.polyline([[workerLat, workerLng], [customerLat, customerLng]], { color: '#1677b8', weight: 4, opacity: 0.65, dashArray: '8,8' }).addTo(map);
                                document.getElementById('routeNote').innerText = 'Road routing is unavailable. Showing direct direction line.';
                              });
                          } else {
                            customerMarker.openPopup();
                          }
                      </script>
                  </body>
                  </html>
                `}}
              />
            </View>
          ) : null}
          {isChatEnabledForRequest(request) ? (
            <PrimaryButton title="Message Customer" onPress={() => onOpenChat?.(request)} style={styles.workerActionButton} textStyle={styles.historyEntryButtonText} />
          ) : null}

          {/* If the customer selected cash, show this to the worker! */}
          {request.status === "started" && request.paymentMethod === "cash" && request.paymentStatus !== "paid" ? (
            <PrimaryButton
              title="Confirm Cash Received"
              onPress={onConfirmCash}
              style={[styles.workerActionButton, { backgroundColor: theme.success }]}
              textStyle={styles.historyEntryButtonText}
            />
          ) : null}

          <PrimaryButton
            title={nextActionMap[request.status] || "Update"}
            onPress={onUpdateStatus}
            style={styles.workerActionButton}
            textStyle={styles.historyEntryButtonText}
            /* Lock the button if it's completed, OR if it's started but unpaid */
            disabled={request.status === "completed" || (request.status === "started" && request.paymentStatus !== "paid")}
          />
          
          {/* Real-time Payment Status Messages for the Worker */}
          {request.status === "started" && request.paymentStatus !== "paid" ? (
            <Text style={[styles.providerEmptyText, { marginTop: 8, color: theme.danger, fontWeight: "700" }]}>
              Customer must process payment before you can mark this completed.
            </Text>
          ) : null}

          {request.status === "started" && request.paymentStatus === "paid" ? (
            <Text style={[styles.providerEmptyText, { marginTop: 8, color: theme.success, fontWeight: "800" }]}>
              Payment Secured ({request.paymentMethod === "cash" ? "Cash" : "Online"}). You may now complete the service!
            </Text>
          ) : null}

          <PrimaryButton
            title="Cancel Request"
            onPress={onCancelRequest}
            style={styles.workerSecondaryButton}
            textStyle={styles.historyEntryButtonText}
            disabled={["on-the-way", "started", "completed", "cancelled"].includes(request.status)}
          />
          <ProofPhotoViewerButton photos={request.proofPhotos || []} buttonLabel="View Submitted Proof" title="Proof of Service" />
        </View>
      </ScrollView>
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState("start");
  const [navDirection, setNavDirection] = useState("forward");
  const [locationPromptVisible, setLocationPromptVisible] = useState(false);
  const [selectedServiceKey, setSelectedServiceKey] = useState("plumbing");
  const [selectedProviderName, setSelectedProviderName] = useState("Juan Dela Cruz");
  const [providerOverlay, setProviderOverlay] = useState(null);
  const [providerOptions, setProviderOptions] = useState([]);
  const [providerListLoading, setProviderListLoading] = useState(false);
  const [providerProfileReviews, setProviderProfileReviews] = useState([]);
  const [statusStep, setStatusStep] = useState("requested");
  const [menuVisible, setMenuVisible] = useState(false);
  const [reviewPostedVisible, setReviewPostedVisible] = useState(false);
  const [namePromptVisible, setNamePromptVisible] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [signInForm, setSignInForm] = useState({ email: "", password: "" });
  const [signUpForm, setSignUpForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [profileForm, setProfileForm] = useState({ displayName: "", bio: "", skills: "", strengths: "", photoURL: "" });
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [profilePhotoError, setProfilePhotoError] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [requestForm, setRequestForm] = useState(emptyRequestForm);
  const [requestError, setRequestError] = useState("");
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [datePickerField, setDatePickerField] = useState(null);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [tempCoordinates, setTempCoordinates] = useState(null);
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ preferredDate: "", preferredTime: "" });
  const [reviewForm, setReviewForm] = useState({ rating: 3, reviewText: "", anonymous: false });
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [customerRequests, setCustomerRequests] = useState([]);
  const [customerRequestsLoading, setCustomerRequestsLoading] = useState(false);
  const [ongoingRequest, setOngoingRequest] = useState(null);
  const [selectedCustomerRequest, setSelectedCustomerRequest] = useState(null);
  const [providerRequests, setProviderRequests] = useState([]);
  const [providerRequestsLoading, setProviderRequestsLoading] = useState(false);
  const [selectedWorkerRequest, setSelectedWorkerRequest] = useState(null);
  const [completionProofVisible, setCompletionProofVisible] = useState(false);
  const [completionProofPhotos, setCompletionProofPhotos] = useState([]);
  const [completionSubmitting, setCompletionSubmitting] = useState(false);
  const [completionProofError, setCompletionProofError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [chatThreadSummaries, setChatThreadSummaries] = useState({});
  const [activeChatMessages, setActiveChatMessages] = useState([]);
  const [selectedChatRequest, setSelectedChatRequest] = useState(null);
  const [chatReturnScreen, setChatReturnScreen] = useState("chat-inbox");
  const [chatTypingState, setChatTypingState] = useState({});
  const [chatText, setChatText] = useState("");
  const [chatImageSending, setChatImageSending] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const lastSendFingerprint = useRef("");
  const typingActive = useRef(false);
  const seenMessageIds = useRef(new Set());
  const pageTranslate = useRef(new Animated.Value(0)).current;
  const pageOpacity = useRef(new Animated.Value(1)).current;
  const typingStopTimer = useRef(null);

  const selectedService = serviceShortcuts.find((item) => item.key === selectedServiceKey) || serviceShortcuts[0];
  const selectedProvider =
    providerOptions.find((provider) => provider.name === selectedProviderName) ||
    selectedService.providers.find((provider) => provider.name === selectedProviderName) ||
    providerOptions[0] ||
    selectedService.providers[0];
  const isProviderUser = currentUserProfile?.role === "provider";
  const chatSourceRequests = isProviderUser ? providerRequests : customerRequests;
  const chatUnreadCount = Object.values(chatThreadSummaries).reduce((total, item) => total + (item.unreadBy?.[currentUser?.uid] || 0), 0);

  const navigateTo = (nextScreen, direction = "forward") => {
    setNavDirection(direction);
    setScreen(nextScreen);
  };

  const loadProviderRequests = async (
    serviceTypes = ["plumbing"],
    userId = currentUser?.uid || "",
    userEmail = currentUser?.email || ""
  ) => {
    try {
      setProviderRequestsLoading(true);
      const data = await getRequestsForProvider({
        userId,
        userEmail,
        serviceTypes
      });
      setProviderRequests(data);
    } finally {
      setProviderRequestsLoading(false);
    }
  };

  const normalizeProviderRequests = (snapshot, userId, userEmail = "", serviceTypes = []) => {
    const normalizedEmail = (userEmail || "").trim().toLowerCase();
    const normalizedServices = serviceTypes.filter(Boolean);

    const requests = snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data()
      }))
      .filter((item) => {
        const assignedUid = item.providerAssignedUid || item.providerUid || "";
        const assignedEmail = (item.providerAssignedEmail || item.providerEmail || "").trim().toLowerCase();
        const serviceMatch = !normalizedServices.length || normalizedServices.includes(item.serviceKey);

        return (
          (assignedUid && assignedUid === userId) ||
          (normalizedEmail && assignedEmail === normalizedEmail) ||
          (!assignedUid && !assignedEmail && serviceMatch)
        );
      });

    const unique = new Map();
    requests.forEach((item) => unique.set(item.id, item));

    return Array.from(unique.values()).sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  };

  const loadCustomerRequests = async (userId) => {
    if (!userId) return;
    try {
      setCustomerRequestsLoading(true);
      const allRequests = await getRequestsForCustomer(userId);
      setCustomerRequests(allRequests);
      const ongoing = await getLatestOngoingRequest(userId);
      setOngoingRequest(ongoing);
    } finally {
      setCustomerRequestsLoading(false);
    }
  };

  const loadNotifications = async (userId = currentUser?.uid || "") => {
    if (!userId) return [];
    try {
      setNotificationsLoading(true);
      const items = await getNotificationsForUser(userId);
      setNotifications(items);
      return items;
    } finally {
      setNotificationsLoading(false);
    }
  };

  const refreshLatestCustomerRequest = async (userId) => {
    if (!userId) return null;
    const allRequests = await getRequestsForCustomer(userId);
    const freshOngoing = allRequests.find((item) => ["requested", "accepted", "on-the-way", "started"].includes(item.status)) || null;
    setCustomerRequests(allRequests);
    setOngoingRequest(freshOngoing);
    return freshOngoing;
  };

  const refreshBlockingRequestForProvider = async (userId, provider) => {
    if (!userId || !provider) return null;
    const allRequests = await getRequestsForCustomer(userId);
    const activeStatuses = ["requested", "accepted", "on-the-way", "started"];
    const normalizedProviderEmail = (provider.email || "").trim().toLowerCase();
    const blockingRequest =
      allRequests.find((item) => {
        if (!activeStatuses.includes(item.status)) return false;
        const sameUid = provider.uid && item.providerUid && item.providerUid === provider.uid;
        const sameAssignedUid = provider.uid && item.providerAssignedUid && item.providerAssignedUid === provider.uid;
        const sameEmail =
          normalizedProviderEmail &&
          [(item.providerEmail || "").trim().toLowerCase(), (item.providerAssignedEmail || "").trim().toLowerCase()].includes(normalizedProviderEmail);

        return sameUid || sameAssignedUid || sameEmail;
      }) || null;

    const latestOngoing = allRequests.find((item) => activeStatuses.includes(item.status)) || null;
    setCustomerRequests(allRequests);
    setOngoingRequest(latestOngoing);
    return blockingRequest;
  };

  const loadProviderOptions = async (serviceKey) => {
    try {
      setProviderListLoading(true);
      const providers = await getProvidersByService(serviceKey);
      setProviderOptions(providers);
      setSelectedProviderName(providers[0]?.name || "");
      return providers;
    } finally {
      setProviderListLoading(false);
    }
  };

  const updateSignInForm = (key, value) => {
    setAuthError("");
    setSignInForm((current) => ({ ...current, [key]: value }));
  };

  const updateSignUpForm = (key, value) => {
    setAuthError("");
    setSignUpForm((current) => ({ ...current, [key]: value }));
  };

  const updateProfileForm = (key, value) => {
    setProfilePhotoError("");
    setProfileForm((current) => ({ ...current, [key]: value }));
  };

  const updateRequestForm = (key, value) => {
    setRequestError("");
    setRequestForm((current) => ({ ...current, [key]: value }));
  };

  const handleDatePicked = (_, dateValue) => {
    if (!dateValue) {
      setDatePickerField(null);
      return;
    }

    const formatted = dateValue.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    if (datePickerField === "request-date") {
      updateRequestForm("date", formatted);
    }

    if (datePickerField === "reschedule-date") {
      setRescheduleForm((current) => ({ ...current, preferredDate: formatted }));
    }

    setDatePickerField(null);
  };

  const handleTimePicked = (_, pickedDate) => {
    if (!pickedDate) {
      setTimePickerVisible(false);
      return;
    }

    const formatted = pickedDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });

    if (datePickerField === "request-time") {
      updateRequestForm("time", formatted);
    } else {
      setRescheduleForm((current) => ({ ...current, preferredTime: formatted }));
    }

    setTimePickerVisible(false);
    setDatePickerField(null);
  };

  const pickProfilePhoto = async () => {
    if (!currentUser) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setProfilePhotoError("Photo library permission is required to upload a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const uri = asset?.uri;
    if (!uri) return;

    try {
      setProfilePhotoUploading(true);
      setProfilePhotoError("");
      const inlinePhoto = await getInlineProfileImageData(asset);
      await updateUserProfile(currentUser.uid, { photoURL: inlinePhoto });
      setCurrentUserProfile((current) => ({ ...current, photoURL: inlinePhoto }));
      setProfileForm((current) => ({ ...current, photoURL: inlinePhoto }));
    } catch (error) {
      setProfilePhotoError(normalizeFirebaseError(error));
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    await updateUserProfile(currentUser.uid, {
      displayName: profileForm.displayName,
      bio: profileForm.bio,
      skills: profileForm.skills || "",
      strengths: profileForm.strengths || ""
    });
    setCurrentUserProfile((current) => ({
      ...current,
      displayName: profileForm.displayName,
      bio: profileForm.bio,
      skills: profileForm.skills || "",
      strengths: profileForm.strengths || ""
    }));
    goBackToDashboard();
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    await deleteUserAccount(currentUser);
    navigateTo("signin", "back");
  };

  const saveNewAccountName = async () => {
    if (!currentUser || !newAccountName.trim()) return;
    await updateUserProfile(currentUser.uid, { displayName: newAccountName.trim() });
    setCurrentUserProfile((current) => ({ ...current, displayName: newAccountName.trim() }));
    setProfileForm((current) => ({ ...current, displayName: newAccountName.trim() }));
    setNamePromptVisible(false);
    setNewAccountName("");
  };

  const openServiceForm = (serviceKey) => {
    setSelectedServiceKey(serviceKey);
    setSelectedProviderName("");
    setRequestError("");
    setRequestForm(emptyRequestForm);
    navigateTo(`form-${serviceKey}`, "forward");
  };

  const openProviderList = () => {
    const requiredFields = ["name", "number", "date", "time", "location", "concern"];
    const hasEmptyField = requiredFields.some((field) => !requestForm[field]?.trim());

    if (hasEmptyField) {
      setRequestError("Please complete all request details first.");
      return;
    }

    loadProviderOptions(selectedServiceKey).then(() => {
      navigateTo(`providers-${selectedServiceKey}`, "forward");
    });
  };

  const openProfile = async (provider) => {
    setSelectedProviderName(provider.name);
    if (provider.uid) {
      const reviewData = await getReviewsForProvider(provider.uid);
      setProviderProfileReviews(reviewData);
    } else {
      setProviderProfileReviews([]);
    }
    setProviderOverlay("profile");
  };

  const openSendRequest = (provider) => {
    setSelectedProviderName(provider.name);
    confirmRequest(provider);
  };

  const confirmRequest = async (providerArg) => {
    if (!currentUser) {
      setProviderOverlay(null);
      setAuthError("Your session expired. Please sign in again.");
      navigateTo("signin", "back");
      return;
    }

    const providerToUse = providerArg || selectedProvider;
    const blockingRequest = await refreshBlockingRequestForProvider(currentUser.uid, providerToUse);

    if (blockingRequest) {
      setProviderOverlay(null);
      setRequestError("You already have an on-going request with this worker. Please finish or cancel it first.");
      setSelectedServiceKey(blockingRequest.serviceKey || selectedServiceKey);
      setSelectedProviderName(blockingRequest.providerName || "");
      setSelectedCustomerRequest(blockingRequest);
      navigateTo(`status-${blockingRequest.serviceKey || selectedServiceKey}`, "forward");
      return;
    }

    try {
      const requestId = await createServiceRequest({
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        serviceKey: selectedService.key,
        serviceLabel: selectedService.detail,
        provider: providerToUse,
        requestForm
      });
const optimisticRequest = {
        id: requestId,
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        serviceKey: selectedService.key,
        serviceLabel: selectedService.detail,
        providerName: providerToUse?.name || "",
        providerUid: providerToUse?.uid || "",
        providerEmail: providerToUse?.email || "",
        customerName: requestForm.name.trim(),
        phoneNumber: requestForm.number.trim(),
        preferredDate: requestForm.date.trim(),
        preferredTime: requestForm.time.trim(),
        location: requestForm.location.trim(),
        landmark: requestForm.landmark.trim(),
        coordinates: requestForm.coordinates || null,
        concern: requestForm.concern.trim(),
        status: "requested",
        statusHistory: {},
        proofPhotos: [],
        reviewSubmitted: false,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        updatedAt: { seconds: Math.floor(Date.now() / 1000) }
      };
      await loadCustomerRequests(currentUser.uid);
      const refreshedRequests = await getRequestsForCustomer(currentUser.uid);
      const exactRequest = refreshedRequests.find((item) => item.id === requestId) || optimisticRequest;
      setCustomerRequests(refreshedRequests.length ? refreshedRequests : [optimisticRequest]);
      setOngoingRequest(exactRequest.status === "requested" ? exactRequest : optimisticRequest);
      await loadNotifications(currentUser.uid);
      setSelectedProviderName(providerToUse?.name || "");
      setSelectedCustomerRequest(exactRequest);
      setStatusStep("requested");
      setProviderOverlay(null);
      navigateTo(`status-${selectedServiceKey}`, "forward");
    } catch (error) {
      setProviderOverlay(null);
      setRequestError(normalizeFirebaseError(error));
      navigateTo(`form-${selectedServiceKey}`, "back");
    }
  };

  const advanceStatus = () => {
    const order = ["requested", "accepted", "on-the-way", "started", "completed"];
    const currentIndex = order.indexOf(statusStep);
    setStatusStep(order[Math.min(currentIndex + 1, order.length - 1)]);
  };

  const openProof = () => {
    navigateTo(`proof-${selectedServiceKey}`, "forward");
  };

  const closeOverlay = () => {
    setProviderOverlay(null);
    setProviderProfileReviews([]);
  };

  const completedRequest = customerRequests.find((item) => item.status === "completed" && item.reviewSubmitted);
  const pendingReviewRequest = customerRequests.find((item) => item.status === "completed" && !item.reviewSubmitted);

  const openCustomerStatus = (request) => {
    setSelectedServiceKey(request.serviceKey);
    setSelectedProviderName(request.providerName || "");
    setSelectedCustomerRequest(request);
    navigateTo(`status-${request.serviceKey}`, "forward");
  };

  const openReviewForRequest = (request) => {
    setSelectedServiceKey(request.serviceKey);
    setSelectedProviderName(request.providerName || "");
    setSelectedCustomerRequest(request);
    setReviewForm({
      rating: request.reviewRating || 3,
      reviewText: request.reviewText || "",
      anonymous: request.reviewAnonymous || false
    });
    navigateTo("review-form", "forward");
  };

  const saveReview = async () => {
    if (!selectedCustomerRequest) return;
    await saveRequestReview(selectedCustomerRequest.id, {
      rating: reviewForm.rating,
      reviewText: reviewForm.reviewText,
      anonymous: reviewForm.anonymous
    });
    if (selectedCustomerRequest.providerUid) {
      await addReviewToProvider(selectedCustomerRequest.providerUid, reviewForm.rating);
    }
    await loadCustomerRequests(currentUser.uid);
    await loadNotifications(currentUser.uid);
    setSelectedCustomerRequest((current) =>
      current
        ? {
            ...current,
            reviewSubmitted: true,
            reviewRating: reviewForm.rating,
            reviewText: reviewForm.reviewText,
            reviewAnonymous: reviewForm.anonymous
          }
        : current
    );
    setReviewPostedVisible(true);
  };
const handleMockPayment = (method) => {
    if (!selectedCustomerRequest) return;
    setPaymentProcessing(true);
    
    setTimeout(async () => {
      try {
        if (method === "cash") {
          // Cash logic: Just mark the method, waiting for worker to confirm
          await updateDoc(doc(db, "requests", selectedCustomerRequest.id), {
            paymentMethod: "cash",
            updatedAt: serverTimestamp()
          });
        } else {
          // Online logic: Instantly paid
          await updateDoc(doc(db, "requests", selectedCustomerRequest.id), {
            paymentMethod: "online",
            paymentStatus: "paid",
            updatedAt: serverTimestamp()
          });
        }
        
        setPaymentProcessing(false);
        setPaymentSuccess(true);
        
        setTimeout(() => {
          setPaymentModalVisible(false);
          setPaymentSuccess(false);
          loadCustomerRequests(currentUser.uid);
        }, 2000);

      } catch (error) {
        console.error("Payment mock failed", error);
        setPaymentProcessing(false);
      }
    }, 2000);
  };

  const handleWorkerConfirmCash = async () => {
    if (!selectedWorkerRequest) return;
    try {
      await updateDoc(doc(db, "requests", selectedWorkerRequest.id), {
        paymentStatus: "paid",
        updatedAt: serverTimestamp()
      });
      const updatedRequest = { ...selectedWorkerRequest, paymentStatus: "paid" };
      setSelectedWorkerRequest(updatedRequest);
      setProviderRequests((current) => current.map((item) => (item.id === updatedRequest.id ? updatedRequest : item)));
    } catch (error) {
      console.error("Failed to confirm cash", error);
    }
  };
  const handleReschedule = async () => {
    if (!selectedCustomerRequest) return;
    if (!rescheduleForm.preferredDate || !rescheduleForm.preferredTime) return;
    await updateCustomerRequestSchedule(selectedCustomerRequest.id, rescheduleForm);
    await loadCustomerRequests(currentUser.uid);
    await loadNotifications(currentUser.uid);
    const refreshed = await getLatestOngoingRequest(currentUser.uid);
    setSelectedCustomerRequest(refreshed || selectedCustomerRequest);
    setRescheduleVisible(false);
  };

  const handleCancelRequest = async () => {
    if (!selectedCustomerRequest) return;
    if (["on-the-way", "started"].includes(selectedCustomerRequest.status)) {
      setCancelConfirmVisible(false);
      return;
    }
    await cancelCustomerRequest(selectedCustomerRequest.id);
    await loadCustomerRequests(currentUser.uid);
    await loadNotifications(currentUser.uid);
    setCancelConfirmVisible(false);
    setSelectedCustomerRequest(null);
    navigateTo("ongoing", "back");
  };

  const openOfferedServices = (serviceKey) => {
    setSelectedServiceKey(serviceKey);
    navigateTo(`offer-${serviceKey}`, "forward");
  };

  const openHistory = () => {
    if (currentUser?.uid) {
      loadCustomerRequests(currentUser.uid);
    }
    navigateTo("history", "forward");
  };

  const openNotifications = async () => {
    if (currentUser?.uid) {
      const items = await loadNotifications(currentUser.uid);
      const unreadIds = items.filter((item) => !item.read).map((item) => item.id);
      if (unreadIds.length) {
        await markNotificationsRead(unreadIds);
        setNotifications((current) => current.map((item) => (unreadIds.includes(item.id) ? { ...item, read: true } : item)));
      }
    }
    navigateTo("notifications", "forward");
  };

  const openChatInbox = () => {
    navigateTo("chat-inbox", "forward");
  };

  const openChatForRequest = (request, returnScreen = screen) => {
    if (!isChatEnabledForRequest(request)) return;
    setSelectedChatRequest(request);
    setChatReturnScreen(returnScreen || "chat-inbox");
    setChatText("");
    setActiveChatMessages([]);
    seenMessageIds.current = new Set();
    navigateTo("chat", "forward");
  };

  const closeActiveChat = async () => {
    const requestToClose = selectedChatRequest;
    if (typingStopTimer.current) {
      clearTimeout(typingStopTimer.current);
      typingStopTimer.current = null;
    }
    typingActive.current = false;
    setChatText("");
    setActiveChatMessages([]);
    setChatTypingState({});
    navigateTo(chatReturnScreen || "chat-inbox", "back");
    if (requestToClose?.id) {
      await updateTypingStatus(requestToClose, false);
    }
  };

  const getChatRecipientId = (request) => {
    if (!request || !currentUser) return "";
    if (isProviderUser) return request.userId || "";
    return request.providerAssignedUid || request.providerUid || "";
  };

  const getChatParticipants = (request) => {
    const customerId = request?.userId || "";
    const providerId = request?.providerAssignedUid || request?.providerUid || "";
    return {
      customerId,
      providerId,
      participantIds: [customerId, providerId].filter(Boolean)
    };
  };

  const upsertChatThread = async (request, latestPayload = {}) => {
    if (!request?.id || !currentUser) return;
    const recipientId = getChatRecipientId(request);
    const { customerId, providerId, participantIds } = getChatParticipants(request);
    if (!recipientId || participantIds.length < 2) return;

    await setDoc(
      doc(db, "chatThreads", request.id),
      {
        requestId: request.id,
        participantIds,
        customerId,
        providerId,
        customerName: request.customerName || "",
        providerName: request.providerName || "",
        serviceLabel: request.serviceLabel || "",
        latestText: latestPayload.text || "",
        latestImage: !!latestPayload.imageUri,
        latestSenderId: currentUser.uid,
        latestMessageAt: serverTimestamp(),
        [`unreadBy.${recipientId}`]: increment(1),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  };

  const updateTypingStatus = async (request, isTyping) => {
    if (!request?.id || !currentUser) return;
    const field = isProviderUser ? "workerTyping" : "customerTyping";
    try {
      await setDoc(
        doc(db, "chatTyping", request.id),
        {
          requestId: request.id,
          participantIds: getChatParticipants(request).participantIds,
          [field]: isTyping,
          [`${field}At`]: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      console.log("Typing status skipped:", error?.message || error);
    }
  };

  const handleChatTextChange = (value) => {
    setChatText(value);
    if (!selectedChatRequest?.id) return;

    const hasText = !!value.trim();
    if (hasText && !typingActive.current) {
      typingActive.current = true;
      updateTypingStatus(selectedChatRequest, true);
    }
    if (!hasText && typingActive.current) {
      typingActive.current = false;
      updateTypingStatus(selectedChatRequest, false);
    }
    if (typingStopTimer.current) {
      clearTimeout(typingStopTimer.current);
    }
    typingStopTimer.current = setTimeout(() => {
      if (typingActive.current) {
        typingActive.current = false;
        updateTypingStatus(selectedChatRequest, false);
      }
    }, 1600);
  };

  const sendChatMessage = async ({ text = "", imageUri = "" } = {}) => {
    if (!selectedChatRequest || !currentUser) return;
    if (!isChatEnabledForRequest(selectedChatRequest)) return;
    if (chatSending && !imageUri) return;
    const messageText = text.trim();
    if (!messageText && !imageUri) return;
    const recipientId = getChatRecipientId(selectedChatRequest);
    if (!recipientId) return;

    const fingerprint = `${selectedChatRequest.id}:${currentUser.uid}:${messageText}:${imageUri ? imageUri.slice(0, 64) : ""}`;
    if (fingerprint === lastSendFingerprint.current) return;

    try {
      setChatSending(true);
      lastSendFingerprint.current = fingerprint;
      await addDoc(collection(db, "chatMessages"), {
        requestId: selectedChatRequest.id,
        participantIds: getChatParticipants(selectedChatRequest).participantIds,
        serviceLabel: selectedChatRequest.serviceLabel || "",
        senderId: currentUser.uid,
        senderRole: isProviderUser ? "provider" : "customer",
        senderName: isProviderUser ? currentUserProfile?.displayName || "Worker" : selectedChatRequest.customerName || currentUserProfile?.displayName || "Customer",
        recipientId,
        text: messageText,
        imageUri,
        seenAt: null,
        createdAt: serverTimestamp()
      });
      await upsertChatThread(selectedChatRequest, { text: messageText, imageUri });
      setChatText("");
      typingActive.current = false;
      await updateTypingStatus(selectedChatRequest, false);
      setTimeout(() => {
        if (lastSendFingerprint.current === fingerprint) {
          lastSendFingerprint.current = "";
        }
      }, 1200);
    } catch (error) {
      lastSendFingerprint.current = "";
      throw error;
    } finally {
      setChatSending(false);
    }
  };

  const sendCurrentChatText = async () => {
    await sendChatMessage({ text: chatText });
  };

  const pickChatImage = async () => {
    if (!selectedChatRequest) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.35,
      base64: true
    });

    if (result.canceled) return;

    try {
      setChatImageSending(true);
      const asset = result.assets?.[0];
      if (!asset) return;
      const inlinePhoto = await getInlineImageData(asset);
      await sendChatMessage({ imageUri: inlinePhoto });
    } finally {
      setChatImageSending(false);
    }
  };

  const openNotificationRequest = async (notification) => {
    if (!notification?.requestId || !currentUser?.uid) {
      return;
    }

    const latestRequests = await getRequestsForCustomer(currentUser.uid);
    setCustomerRequests(latestRequests);
    const matchedRequest = latestRequests.find((item) => item.id === notification.requestId);

    if (matchedRequest) {
      setSelectedCustomerRequest(matchedRequest);
      setSelectedServiceKey(matchedRequest.serviceKey || selectedServiceKey);
      setSelectedProviderName(matchedRequest.providerName || "");
      navigateTo(`status-${matchedRequest.serviceKey}`, "forward");
      return;
    }

    navigateTo("notifications", "forward");
  };

  const openOngoing = () => {
    const openAsync = async () => {
      if (!currentUser?.uid) {
        navigateTo("ongoing", "forward");
        return;
      }

      const freshOngoing = await refreshLatestCustomerRequest(currentUser.uid);
      setSelectedCustomerRequest(freshOngoing);
      setStatusStep(freshOngoing?.status || "requested");
      navigateTo("ongoing", "forward");
    };

    openAsync();
  };

  const goBackToDashboard = () => {
    navigateTo(currentUserProfile?.role === "provider" ? "provider-dashboard" : "dashboard", "back");
  };

  const openProviderRequests = async () => {
    await loadProviderRequests(
      currentUserProfile?.serviceTypes || [currentUserProfile?.serviceType || "plumbing"],
      currentUser?.uid || "",
      currentUser?.email || ""
    );
    navigateTo("provider-requests", "forward");
  };

  const openProviderHistory = async () => {
    await loadProviderRequests(
      currentUserProfile?.serviceTypes || [currentUserProfile?.serviceType || "plumbing"],
      currentUser?.uid || "",
      currentUser?.email || ""
    );
    navigateTo("provider-history", "forward");
  };

  const openWorkerRequestDetail = (request) => {
    setSelectedWorkerRequest(request);
    navigateTo("provider-request-detail", "forward");
  };

  const advanceWorkerRequest = async () => {
    if (!selectedWorkerRequest || !currentUser) {
      return;
    }

    const nextByStatus = {
      requested: "accepted",
      accepted: "on-the-way",
      "on-the-way": "started",
      started: "completed",
      completed: "completed"
    };

    const nextStatus = nextByStatus[selectedWorkerRequest.status || "requested"];
    if (nextStatus === "completed") {
      setCompletionProofError("");
      setCompletionProofPhotos(selectedWorkerRequest.proofPhotos || []);
      setCompletionProofVisible(true);
      return;
    }

    await updateProviderRequestStatus(selectedWorkerRequest.id, nextStatus, {
      uid: currentUser.uid,
      email: currentUser.email
    });

    const updatedRequest = { ...selectedWorkerRequest, status: nextStatus };
    setSelectedWorkerRequest(updatedRequest);
    setProviderRequests((current) => current.map((item) => (item.id === updatedRequest.id ? updatedRequest : item)));
    await loadProviderRequests(
      currentUserProfile?.serviceTypes || [currentUserProfile?.serviceType || "plumbing"],
      currentUser.uid,
      currentUser.email || ""
    );
  };

  const pickCompletionProofPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setCompletionProofError("Photo library permission is required to upload proof photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 3,
      orderedSelection: true,
      quality: 0.25,
      base64: true
    });

    if (result.canceled) return;

    const pickedPhotos = (result.assets || []).filter((item) => item?.uri).slice(0, 3);
    setCompletionProofError("");
    setCompletionProofPhotos((current) => {
      const combined = [...current, ...pickedPhotos];
      return combined.slice(0, 3);
    });
  };

  const removeCompletionProofPhoto = (indexToRemove) => {
    setCompletionProofError("");
    setCompletionProofPhotos((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const submitCompletionProof = async () => {
    if (!selectedWorkerRequest || !currentUser || completionProofPhotos.length === 0) return;

    try {
      setCompletionSubmitting(true);
      setCompletionProofError("");
      const uploadedPhotos = [];
      for (const asset of completionProofPhotos.slice(0, 3)) {
        const inlinePhoto = await getInlineImageData(asset);
        uploadedPhotos.push(inlinePhoto);
      }

      const totalInlineBytes = uploadedPhotos.reduce((sum, item) => sum + (item?.length || 0), 0);
      if (totalInlineBytes > MAX_PROOF_INLINE_BYTES) {
        throw new Error("Selected photos are still too large. Please choose fewer photos or screenshots with less detail.");
      }

      await updateProviderRequestStatus(
        selectedWorkerRequest.id,
        "completed",
        {
          uid: currentUser.uid,
          email: currentUser.email
        },
        {
          proofPhotos: uploadedPhotos
        }
      );
      await attachProofToRequest(selectedWorkerRequest.id, uploadedPhotos);

      const updatedRequest = {
        ...selectedWorkerRequest,
        status: "completed",
        proofPhotos: uploadedPhotos,
        statusHistory: {
          ...(selectedWorkerRequest.statusHistory || {}),
          completed: { seconds: Math.floor(Date.now() / 1000) }
        }
      };
      setSelectedWorkerRequest(updatedRequest);
      setProviderRequests((current) => current.map((item) => (item.id === updatedRequest.id ? updatedRequest : item)));
      setCompletionProofVisible(false);
      setCompletionProofPhotos([]);

      await loadProviderRequests(
        currentUserProfile?.serviceTypes || [currentUserProfile?.serviceType || "plumbing"],
        currentUser.uid,
        currentUser.email || ""
      );
      navigateTo("provider-history", "forward");
    } catch (error) {
      setCompletionProofError(normalizeFirebaseError(error));
    } finally {
      setCompletionSubmitting(false);
    }
  };

  const cancelWorkerRequest = async () => {
    if (!selectedWorkerRequest || !currentUser) return;
    await updateProviderRequestStatus(
      selectedWorkerRequest.id,
      "cancelled",
      {
        uid: currentUser.uid,
        email: currentUser.email
      }
    );
    const updatedRequest = { ...selectedWorkerRequest, status: "cancelled" };
    setSelectedWorkerRequest(updatedRequest);
    setProviderRequests((current) => current.map((item) => (item.id === updatedRequest.id ? updatedRequest : item)));
    await loadProviderRequests(
      currentUserProfile?.serviceTypes || [currentUserProfile?.serviceType || "plumbing"],
      currentUser.uid,
      currentUser.email || ""
    );
  };

  const handleSignIn = async () => {
    if (!signInForm.email || !signInForm.password) {
      setAuthError("Please enter your email and password.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError("");
      const user = await signInWithFirebase(signInForm);
      const profile = await ensureUserProfile(user);
      setCurrentUser(user);
      setCurrentUserProfile(profile);
      setProfileForm({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        skills: profile.skills || "",
        strengths: profile.strengths || "",
        photoURL: profile.photoURL || ""
      });
      setSignInForm({ email: "", password: "" });
      if (profile.role !== "provider") {
        await loadCustomerRequests(user.uid);
        await loadNotifications(user.uid);
      } else {
        await loadProviderRequests(profile.serviceTypes || [profile.serviceType || "plumbing"], user.uid, user.email || "");
      }
      setNamePromptVisible(false);
      navigateTo(profile.role === "provider" ? "provider-dashboard" : "dashboard", "forward");
    } catch (error) {
      setAuthError(normalizeFirebaseError(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!signUpForm.email || !signUpForm.password || !signUpForm.confirmPassword) {
      setAuthError("Please complete all sign-up fields.");
      return;
    }

    if (signUpForm.password !== signUpForm.confirmPassword) {
      setAuthError("Password and confirm password do not match.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError("");
      const user = await signUpWithFirebase(signUpForm);
      const profile = await ensureUserProfile(user);
      setCurrentUser(user);
      setCurrentUserProfile(profile);
      setProfileForm({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        skills: profile.skills || "",
        strengths: profile.strengths || "",
        photoURL: profile.photoURL || ""
      });
      setSignUpForm({ email: "", password: "", confirmPassword: "" });
      if (profile.role !== "provider") {
        await loadCustomerRequests(user.uid);
        await loadNotifications(user.uid);
      } else {
        await loadProviderRequests(profile.serviceTypes || [profile.serviceType || "plumbing"], user.uid, user.email || "");
      }
      setNamePromptVisible(false);
      navigateTo(profile.role === "provider" ? "provider-dashboard" : "dashboard", "forward");
    } catch (error) {
      setAuthError(normalizeFirebaseError(error));
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    pageTranslate.setValue(navDirection === "back" ? -SCREEN_WIDTH * 0.16 : SCREEN_WIDTH * 0.16);
    pageOpacity.setValue(0.82);
    Animated.parallel([
      Animated.timing(pageTranslate, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(pageOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true
      })
    ]).start();
  }, [navDirection, pageOpacity, pageTranslate, screen]);

  useEffect(() => {
    if (screen === "dashboard" && currentUser?.uid && currentUserProfile?.role !== "provider") {
      loadNotifications(currentUser.uid);
    }
  }, [currentUser?.uid, currentUserProfile?.role, screen]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const hydrateUser = async () => {
        try {
          setCurrentUser(user);

          if (user) {
            const profile = await ensureUserProfile(user);
            setCurrentUserProfile(profile);
            setProfileForm({
              displayName: profile.displayName || "",
              bio: profile.bio || "",
              skills: profile.skills || "",
              strengths: profile.strengths || "",
              photoURL: profile.photoURL || ""
            });

            if (
              user.uid === SPECIAL_WORKER_UID ||
              user.email === SPECIAL_WORKER_EMAIL ||
              profile.role === "provider"
            ) {
              await loadProviderRequests(profile.serviceTypes || [profile.serviceType || "plumbing"], user.uid, user.email || "");
            } else {
              await loadCustomerRequests(user.uid);
              await loadNotifications(user.uid);
            }

            setNamePromptVisible(false);

            setScreen((current) => {
              if (current === "start" || current === "signin" || current === "signup") {
                return profile.role === "provider" ? "provider-dashboard" : "dashboard";
              }

              return current;
            });
          } else {
            setCurrentUserProfile(null);
            setProviderRequests([]);
            setCustomerRequests([]);
            setNotifications([]);
            setChatThreadSummaries({});
            setActiveChatMessages([]);
            setOngoingRequest(null);
            setSelectedWorkerRequest(null);
            setSelectedChatRequest(null);
            setNamePromptVisible(false);
            setScreen((current) => (current !== "start" && current !== "signin" && current !== "signup" ? "signin" : current));
          }
        } catch (error) {
          console.error("Error during initial data hydration:", error);
          await signOutFromFirebase(); 
        } finally {
          setAuthReady(true);
        }
      };

      hydrateUser();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};

    if (currentUser?.uid && currentUserProfile?.role !== "provider") {
      const q = query(collection(db, "requests"), where("userId", "==", currentUser.uid));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const allRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allRequests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        setCustomerRequests(allRequests);
        
        const activeStatuses = ["requested", "accepted", "on-the-way", "started"];
        const ongoing = allRequests.find(item => activeStatuses.includes(item.status)) || null;
        setOngoingRequest(ongoing);

        setSelectedCustomerRequest(currentSelected => {
          if (!currentSelected) return currentSelected;
          return allRequests.find(r => r.id === currentSelected.id) || currentSelected;
        });
      });
    }

    return () => unsubscribe();
  }, [currentUser?.uid, currentUserProfile?.role]);

  useEffect(() => {
    let unsubscribe = () => {};

    if (currentUser?.uid && currentUserProfile?.role === "provider") {
      const serviceTypes = currentUserProfile?.serviceTypes || [currentUserProfile?.serviceType || "plumbing"];
      const q = query(collection(db, "requests"));
      setProviderRequestsLoading(true);

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const liveRequests = normalizeProviderRequests(snapshot, currentUser.uid, currentUser.email || "", serviceTypes);
          setProviderRequests(liveRequests);
          setSelectedWorkerRequest((currentSelected) => {
            if (!currentSelected) return currentSelected;
            return liveRequests.find((item) => item.id === currentSelected.id) || currentSelected;
          });
          setProviderRequestsLoading(false);
        },
        (error) => {
          console.error("Worker request listener failed:", error);
          setProviderRequestsLoading(false);
        }
      );
    }

    return () => unsubscribe();
  }, [currentUser?.uid, currentUser?.email, currentUserProfile?.role, currentUserProfile?.serviceType, currentUserProfile?.serviceTypes]);

  useEffect(() => {
    let unsubscribe = () => {};

    if (currentUser?.uid) {
      unsubscribe = onSnapshot(
        query(collection(db, "chatThreads"), where("participantIds", "array-contains", currentUser.uid)),
        (snapshot) => {
          const nextSummaries = {};
          snapshot.docs.forEach((item) => {
            const data = item.data();
            nextSummaries[data.requestId || item.id] = {
              id: item.id,
              ...data
            };
          });
          setChatThreadSummaries(nextSummaries);
        },
        (error) => {
          console.error("Chat summary listener failed:", error);
        }
      );
    } else {
      setChatThreadSummaries({});
    }

    return () => unsubscribe();
  }, [currentUser?.uid]);

  useEffect(() => {
    let unsubscribeMessages = () => {};
    let unsubscribeTyping = () => {};

    if (screen === "chat" && selectedChatRequest?.id && currentUser?.uid) {
      const requestId = selectedChatRequest.id;
      seenMessageIds.current = new Set();
      const { customerId, providerId, participantIds } = getChatParticipants(selectedChatRequest);

      setDoc(
        doc(db, "chatThreads", requestId),
        {
          requestId,
          participantIds,
          customerId,
          providerId,
          customerName: selectedChatRequest.customerName || "",
          providerName: selectedChatRequest.providerName || "",
          serviceLabel: selectedChatRequest.serviceLabel || "",
          [`unreadBy.${currentUser.uid}`]: 0,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      ).catch((error) => console.log("Chat thread open update skipped:", error?.message || error));

      unsubscribeMessages = onSnapshot(
        query(collection(db, "chatMessages"), where("requestId", "==", requestId)),
        (snapshot) => {
          const messages = snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data()
            }))
            .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

          setActiveChatMessages(messages);

          const unseenReceived = messages
            .filter((item) => item.recipientId === currentUser.uid && !item.seenAt && !seenMessageIds.current.has(item.id))
            .slice(0, 100);

          if (unseenReceived.length) {
            const batch = writeBatch(db);
            unseenReceived.forEach((item) => {
              seenMessageIds.current.add(item.id);
              batch.update(doc(db, "chatMessages", item.id), {
                seenAt: serverTimestamp()
              });
            });
            batch.set(
              doc(db, "chatThreads", requestId),
              {
                [`unreadBy.${currentUser.uid}`]: 0,
                updatedAt: serverTimestamp()
              },
              { merge: true }
            );
            batch.commit().catch((error) => console.log("Chat seen update skipped:", error?.message || error));
          }
        },
        (error) => {
          console.error("Chat message listener failed:", error);
        }
      );

      unsubscribeTyping = onSnapshot(doc(db, "chatTyping", requestId), (snapshot) => {
        setChatTypingState(snapshot.exists() ? snapshot.data() : {});
      });
    } else {
      setActiveChatMessages([]);
      setChatTypingState({});
    }

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      if (typingActive.current && selectedChatRequest?.id) {
        typingActive.current = false;
        updateTypingStatus(selectedChatRequest, false);
      }
    };
  }, [currentUser?.uid, screen, selectedChatRequest?.id]);

  useEffect(() => {
    return () => {
      if (typingStopTimer.current) {
        clearTimeout(typingStopTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedChatRequest?.id) return;
    const freshRequest = chatSourceRequests.find((item) => item.id === selectedChatRequest.id);
    if (freshRequest) {
      setSelectedChatRequest(freshRequest);
    }
  }, [chatSourceRequests, selectedChatRequest?.id]);

  if (!authReady) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bg} translucent={false} />
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingText}>Loading ServEase...</Text>
        </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} translucent={false} />
      <Animated.View style={[styles.pageTransitionWrap, { opacity: pageOpacity, transform: [{ translateX: pageTranslate }] }]}>
        {screen === "start" && <StartScreen onNext={() => navigateTo("signin", "forward")} />}
        {screen === "signin" && (
          <SignInScreen
            onLogin={handleSignIn}
            onGoSignUp={() => navigateTo("signup", "forward")}
            values={signInForm}
            onChangeText={updateSignInForm}
            errorMessage={authError}
            isLoading={authLoading}
          />
        )}
        {screen === "signup" && (
          <SignUpScreen
            onSignUp={handleSignUp}
            onGoSignIn={() => navigateTo("signin", "back")}
            values={signUpForm}
            onChangeText={updateSignUpForm}
            errorMessage={authError}
            isLoading={authLoading}
          />
        )}
        {screen === "dashboard" && (
          <DashboardScreen
            unreadCount={notifications.filter((item) => !item.read).length}
            chatUnreadCount={chatUnreadCount}
            showLocationModal={locationPromptVisible}
            onEnableLocation={() => setLocationPromptVisible(false)}
            onLater={() => setLocationPromptVisible(false)}
            onOpenNotifications={openNotifications}
            onOpenMessages={openChatInbox}
            onOpenService={openServiceForm}
            onOpenOffer={openOfferedServices}
            onOpenHistory={openHistory}
            onOpenOngoing={openOngoing}
            onOpenGuide={() => navigateTo("customer-guide", "forward")}
            onMenuPress={() => setMenuVisible(true)}
            onCloseMenu={() => setMenuVisible(false)}
            onOpenProfile={() => {
              setMenuVisible(false);
              navigateTo("profile", "forward");
            }}
            onOpenAbout={() => {
              setMenuVisible(false);
              navigateTo("about-us", "forward");
            }}
            menuVisible={menuVisible}
            onSignOut={async () => {
              setMenuVisible(false);
              await signOutFromFirebase();
              navigateTo("signin", "back");
            }}
          />
        )}
        {screen === "about-us" && <AboutUsScreen onBack={goBackToDashboard} />}
        {screen === "notifications" && (
          <NotificationScreen
            onBack={goBackToDashboard}
            notifications={notifications}
            loading={notificationsLoading}
            onOpenRequest={openNotificationRequest}
          />
        )}
        {screen === "customer-guide" && <CustomerGuideScreen onBack={goBackToDashboard} />}
        {screen === "chat-inbox" && (
          <ChatInboxScreen
            requests={chatSourceRequests}
            threadSummaries={chatThreadSummaries}
            currentUser={currentUser}
            isProvider={isProviderUser}
            onBack={goBackToDashboard}
            onOpenChat={openChatForRequest}
          />
        )}
        {screen === "chat" && selectedChatRequest && (
          <ChatScreen
            request={selectedChatRequest}
            currentUser={currentUser}
            isProvider={isProviderUser}
            messages={activeChatMessages}
            typingState={chatTypingState}
            chatText={chatText}
            imageSending={chatImageSending}
            sending={chatSending}
            onBack={closeActiveChat}
            onChangeText={handleChatTextChange}
            onSend={sendCurrentChatText}
            onPickImage={pickChatImage}
          />
        )}
        {screen === "provider-dashboard" && (
          <ProviderDashboardScreen
            profile={currentUserProfile}
            requests={providerRequests}
            loading={providerRequestsLoading}
            chatUnreadCount={chatUnreadCount}
            onOpenRequests={openProviderRequests}
            onOpenHistory={openProviderHistory}
            onOpenMessages={openChatInbox}
            onOpenProfile={() => navigateTo("profile", "forward")}
            onSignOut={async () => {
              await signOutFromFirebase();
              navigateTo("signin", "back");
            }}
          />
        )}
        {screen === "provider-requests" && (
          <ProviderRequestsScreen
            requests={providerRequests}
            loading={providerRequestsLoading}
            onBack={() => navigateTo("provider-dashboard", "back")}
            onOpenRequest={openWorkerRequestDetail}
          />
        )}
        {screen === "provider-history" && (
          <ProviderHistoryScreen
            requests={providerRequests}
            loading={providerRequestsLoading}
            onBack={() => navigateTo("provider-dashboard", "back")}
            onOpenRequest={openWorkerRequestDetail}
          />
        )}
        {screen === "provider-request-detail" && selectedWorkerRequest && (
          <ProviderRequestDetailScreen
            request={selectedWorkerRequest}
            onBack={() => navigateTo("provider-requests", "back")}
            onUpdateStatus={advanceWorkerRequest}
            onCancelRequest={cancelWorkerRequest}
            onOpenChat={openChatForRequest}
            onConfirmCash={handleWorkerConfirmCash} /* <-- ADD THIS LINE */
          />
        )}
        {screen.startsWith("offer-") && <OfferedServicesScreen service={selectedService} onBack={goBackToDashboard} />}
        {screen.startsWith("form-") && (
          <ServiceFormScreen
            service={selectedService}
            onBack={goBackToDashboard}
            onSubmit={openProviderList}
            values={requestForm}
            onChangeText={updateRequestForm}
            errorMessage={requestError}
            onOpenDate={() => setDatePickerField("request-date")}
            onOpenTime={() => {
              setDatePickerField("request-time");
              setTimePickerVisible(true);
            }}
            onOpenMap={() => {
              // Default view slightly around Batangas region
              setTempCoordinates(requestForm.coordinates || { latitude: 13.8443, longitude: 121.2140 }); 
              setMapPickerVisible(true);
            }}
          />
        )}
        {screen.startsWith("providers-") && (
        <ProviderListScreen
          service={selectedService}
          providers={providerOptions}
          loading={providerListLoading}
          onBack={() => navigateTo(`form-${selectedServiceKey}`, "back")}
          onCancel={goBackToDashboard}
          onViewProfile={openProfile}
          onSendRequest={openSendRequest}
            selectedProvider={selectedProvider}
            showProfile={providerOverlay === "profile"}
          providerProfileReviews={providerProfileReviews}
            closeOverlay={closeOverlay}
            confirmRequest={confirmRequest}
          />
        )}
        {screen.startsWith("status-") && (
        <RequestStatusScreen
          service={selectedService}
          provider={selectedProvider}
          activeStep={selectedCustomerRequest?.status || ongoingRequest?.status || statusStep}
          request={selectedCustomerRequest || ongoingRequest}
          onBack={() => navigateTo(currentUserProfile?.role === "provider" ? `providers-${selectedServiceKey}` : "ongoing", "back")}
          onAdvance={advanceStatus}
          onProof={openProof}
          onLeaveReview={() => pendingReviewRequest && openReviewForRequest(pendingReviewRequest)}
          onReschedule={() => setRescheduleVisible(true)}
          onCancel={() => setCancelConfirmVisible(true)}
          onDone={goBackToDashboard}
          onOpenChat={openChatForRequest}
          onOpenPayment={() => setPaymentModalVisible(true)}
        />
      )}
      {screen.startsWith("proof-") && (
        <RequestStatusScreen
          service={selectedService}
          provider={selectedProvider}
          activeStep="proof"
          request={selectedCustomerRequest || ongoingRequest}
          onBack={() => navigateTo(`status-${selectedServiceKey}`, "back")}
          onAdvance={() => {}}
          onProof={openProof}
          onLeaveReview={() => pendingReviewRequest && openReviewForRequest(pendingReviewRequest)}
          onReschedule={() => {}}
          onCancel={() => {}}
          onDone={() => navigateTo(`status-${selectedServiceKey}`, "back")}
          onOpenChat={openChatForRequest}
        />
      )}
      {screen === "history" && (
          <HistoryScreen
            onBack={goBackToDashboard}
            completedRequest={completedRequest}
            pendingReviewRequest={pendingReviewRequest}
            onViewMyReview={() => completedRequest && navigateTo("my-review", "forward")}
            onLeaveReview={() => pendingReviewRequest && openReviewForRequest(pendingReviewRequest)}
            onOpenPayment={() => {
              setSelectedCustomerRequest(pendingReviewRequest);
              setPaymentModalVisible(true);
            }}
          />
      )}
      {screen === "ongoing" && <OngoingRequestScreen onBack={goBackToDashboard} request={ongoingRequest} onViewStatus={() => ongoingRequest && openCustomerStatus(ongoingRequest)} />}
      {screen === "review-form" && (
        <ReviewFormScreen
          onBack={() => navigateTo("history", "back")}
          onSubmit={saveReview}
          reviewPostedVisible={reviewPostedVisible}
          onContinue={() => {
            setReviewPostedVisible(false);
            navigateTo("my-review", "forward");
          }}
          request={selectedCustomerRequest}
          reviewForm={reviewForm}
          onChangeReview={(key, value) => setReviewForm((current) => ({ ...current, [key]: value }))}
        />
      )}
      {screen === "my-review" && <MyReviewScreen onBack={() => navigateTo("history", "back")} request={selectedCustomerRequest || completedRequest} />}
      {screen === "profile" && (
        <ProfileScreen
          profile={currentUserProfile}
          isProvider={currentUserProfile?.role === "provider"}
          onBack={goBackToDashboard}
          profileForm={profileForm}
          onChange={updateProfileForm}
          onPickPhoto={pickProfilePhoto}
          onSave={saveProfile}
          onDeleteAccount={handleDeleteAccount}
          photoUploadLoading={profilePhotoUploading}
          uploadError={profilePhotoError}
        />
      )}
      <NamePromptModal visible={namePromptVisible} value={newAccountName} onChange={setNewAccountName} onSave={saveNewAccountName} />
      {datePickerField === "request-date" || datePickerField === "reschedule-date" ? (
        <DateTimePicker mode="date" value={new Date()} onChange={handleDatePicked} />
      ) : null}
      {timePickerVisible ? <DateTimePicker mode="time" value={new Date()} onChange={handleTimePicked} /> : null}
      <Modal transparent visible={rescheduleVisible} animationType="fade">
        <View style={styles.profileModalBackdrop}>
          <AnimatedPopup style={styles.confirmModalCard}>
            <Text style={styles.reviewFormTitle}>Re-schedule Request</Text>
            <Pressable style={styles.requestInputWrap} onPress={() => setDatePickerField("reschedule-date")}>
              <Text style={styles.requestInput}>{rescheduleForm.preferredDate || "Pick a date"}</Text>
              <Ionicons name="calendar-outline" size={20} color="#7d7d7d" />
            </Pressable>
            <Pressable
              style={[styles.requestInputWrap, styles.rescheduleTimeWrap]}
              onPress={() => {
                setDatePickerField("reschedule-time");
                setTimePickerVisible(true);
              }}
            >
              <Text style={styles.requestInput}>{rescheduleForm.preferredTime || "Pick a time"}</Text>
              <Ionicons name="time-outline" size={20} color="#7d7d7d" />
            </Pressable>
            <View style={styles.equalButtonColumn}>
              <PrimaryButton title="Save Schedule" onPress={handleReschedule} style={styles.equalActionButton} textStyle={styles.historyEntryButtonText} />
              <PrimaryButton title="Close" onPress={() => setRescheduleVisible(false)} style={[styles.equalActionButton, styles.equalActionButtonSecondary]} textStyle={styles.historyEntryButtonText} />
            </View>
          </AnimatedPopup>
        </View>
      </Modal>
      <Modal transparent visible={cancelConfirmVisible} animationType="fade">
        <View style={styles.profileModalBackdrop}>
          <AnimatedPopup style={styles.confirmModalCard}>
            <Text style={styles.reviewFormTitle}>Cancel Request?</Text>
            <Text style={styles.reviewPostedText}>Do you really want to cancel this service request?</Text>
            <PrimaryButton title="Yes, Cancel" onPress={handleCancelRequest} style={styles.reviewPostedButton} textStyle={styles.historyEntryButtonText} />
            <PrimaryButton title="Keep Request" onPress={() => setCancelConfirmVisible(false)} style={styles.workerSecondaryButton} textStyle={styles.historyEntryButtonText} />
          </AnimatedPopup>
        </View>
      </Modal>
      <CompletionProofModal
        visible={completionProofVisible}
        photos={completionProofPhotos}
        errorMessage={completionProofError}
        onPickPhotos={pickCompletionProofPhotos}
        onRemovePhoto={removeCompletionProofPhoto}
        onClose={() => {
          if (completionSubmitting) return;
          setCompletionProofVisible(false);
          setCompletionProofPhotos([]);
          setCompletionProofError("");
        }}
        onSubmit={submitCompletionProof}
        isSubmitting={completionSubmitting}
      />

      <Modal transparent visible={mapPickerVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: theme.blue, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Pin Your Location</Text>
            <Pressable onPress={() => setMapPickerVisible(false)}>
              <Ionicons name="close-circle" size={28} color="#fff" />
            </Pressable>
          </View>
          
          <View style={{ padding: 12, alignItems: 'center', backgroundColor: '#f8f9fa' }}>
            <Text style={{ fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 8 }}>Tap anywhere on the map to place your pin.</Text>
            <Pressable 
              style={{ backgroundColor: '#2d8fdb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              onPress={async () => {
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== 'granted') {
                    alert('Permission to access location was denied');
                    return;
                  }
                  const location = await Location.getCurrentPositionAsync({});
                  setTempCoordinates({ latitude: location.coords.latitude, longitude: location.coords.longitude });
                } catch (error) {
                  alert('Could not fetch location. Please ensure GPS is turned on.');
                }
              }}
            >
              <Ionicons name="locate" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Auto-Detect My Location</Text>
            </Pressable>
          </View>

          <View style={{ flex: 1 }}>
            {mapPickerVisible ? (
              <WebView 
                key={tempCoordinates ? `${tempCoordinates.latitude}-${tempCoordinates.longitude}` : 'map'}
                source={{ html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <style> body { padding: 0; margin: 0; } #map { height: 100vh; width: 100vw; } </style>
                  </head>
                  <body>
                      <div id="map"></div>
                      <script>
                          var initialLat = ${tempCoordinates?.latitude || 13.8443};
                          var initialLng = ${tempCoordinates?.longitude || 121.2140};
                          var map = L.map('map').setView([initialLat, initialLng], 16);
                          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
                          
                          var marker = L.marker([initialLat, initialLng]).addTo(map);
                          
                          map.on('click', function(e) {
                              if(marker) map.removeLayer(marker);
                              marker = L.marker(e.latlng).addTo(map);
                              window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: e.latlng.lat, longitude: e.latlng.lng }));
                          });
                      </script>
                  </body>
                  </html>
                `}}
                onMessage={(event) => {
                  try {
                    const coords = JSON.parse(event.nativeEvent.data);
                    // Update state without causing a full reload of the map
                    setTempCoordinates(coords);
                  } catch (e) {}
                }}
              />
            ) : null}
          </View>

          <View style={{ padding: 20, paddingBottom: 40, backgroundColor: '#fff' }}>
            <PrimaryButton 
              title={tempCoordinates ? "Save Pinned Location" : "Tap the map first"} 
              onPress={() => {
                updateRequestForm("coordinates", tempCoordinates);
                setMapPickerVisible(false);
              }} 
              disabled={!tempCoordinates}
              style={{ width: '100%', height: 46, borderRadius: 10 }}
            />
          </View>
        </View>
        </Modal>

        <PaymentCheckoutModal 
          visible={paymentModalVisible} 
          request={selectedCustomerRequest}
          onClose={() => setPaymentModalVisible(false)}
          onPay={handleMockPayment}
          processing={paymentProcessing}
          success={paymentSuccess}
        />
        
      </Animated.View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg
  },
  keyboardAvoiding: {
    flex: 1
  },
  pageTransitionWrap: {
    flex: 1
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.blueDark
  },
  startScreen: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.surface,
    paddingHorizontal: 24,
    paddingBottom: 48
  },
  brandWrap: {
    alignItems: "center"
  },
  logoGrid: {
    position: "relative"
  },
  logoTile: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "45deg" }]
  },
  brandName: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.text,
    letterSpacing: 0,
    marginTop: 18
  },
  brandNameCompact: {
    fontSize: 24,
    marginTop: 12
  },
  brandTag: {
    fontSize: 12,
    color: theme.muted,
    letterSpacing: 2,
    textTransform: "lowercase",
    marginTop: 6
  },
  primaryButton: {
    minWidth: 140,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: theme.blue,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    paddingHorizontal: 16
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800"
  },
  buttonDisabled: {
    backgroundColor: "#d4d7da",
    shadowOpacity: 0,
    elevation: 0
  },
  buttonDisabledText: {
    color: "#f6f6f6"
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }]
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  iconCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  getStartedButton: {
    width: "100%",
    height: 52,
    borderRadius: 16
  },
  getStartedText: {
    fontSize: 16
  },
  authScreen: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 24,
    backgroundColor: theme.bg
  },
  authCard: {
    width: "100%",
    backgroundColor: theme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  authHeader: {
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
    paddingBottom: 8
  },
  authHeaderText: {
    color: theme.text,
    fontWeight: "800",
    fontSize: 22
  },
  fieldWrap: {
    paddingHorizontal: 18,
    paddingTop: 14
  },
  fieldLabel: {
    color: theme.muted,
    fontSize: 12,
    marginBottom: 7,
    fontWeight: "700"
  },
  fieldInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: "#f9fbfd",
    paddingHorizontal: 14,
    color: theme.text,
    fontSize: 14
  },
  authButton: {
    alignSelf: "center",
    marginTop: 18,
    width: "88%",
    height: 48,
    borderRadius: 14
  },
  authErrorText: {
    color: "#c83434",
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 12
  },
  authFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 10
  },
  authFooterText: {
    fontSize: 12,
    color: theme.muted
  },
  authFooterLink: {
    color: theme.blueDark,
    fontWeight: "700"
  },
  dashboardScreen: {
    flex: 1,
    backgroundColor: theme.bg
  },
  headerArea: {
    height: Math.min(244, Math.max(220, SCREEN_HEIGHT * 0.255)),
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 16
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,35,58,0.34)"
  },
  headerIcons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12
  },
  headerBellButton: {
    position: "relative"
  },
  headerBellBadge: {
    position: "absolute",
    top: -7,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#f24444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  headerBellBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800"
  },
  headerCopy: {
    marginTop: 26,
    maxWidth: "82%"
  },
  headerEyebrow: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 5
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 33
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8
  },
  guidePill: {
    position: "absolute",
    right: 20,
    bottom: 18,
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19
  },
  guideText: {
    color: theme.navy,
    fontWeight: "800"
  },
  dashboardContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 36
  },
  featuredFrame: {
    marginTop: 0
  },
  featuredTrack: {
    gap: 12,
    paddingHorizontal: 1,
    paddingTop: 12
  },
  featureImage: {
    width: SCREEN_WIDTH - 58,
    height: Math.min(156, Math.max(132, SCREEN_WIDTH * 0.38)),
    borderRadius: 8,
    backgroundColor: theme.border
  },
  paginationWrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 6
  },
  paginationDotInactive: {
    width: 14,
    height: 4,
    borderRadius: 99,
    backgroundColor: "#d8d8d8"
  },
  paginationDotActive: {
    width: 22,
    height: 4,
    borderRadius: 99,
    backgroundColor: "#3048a0"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.text,
    marginTop: 18,
    marginBottom: 12
  },
  shortcutsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  shortcutCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2
  },
  shortcutIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: theme.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6
  },
  shortcutLabel: {
    fontSize: 11,
    textAlign: "center",
    fontWeight: "700",
    color: theme.text
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    padding: 15,
    gap: 14,
    shadowColor: "#000",
    borderWidth: 1,
    borderColor: theme.border,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  serviceIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.blueSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  serviceCardBody: {
    flex: 1
  },
  serviceCardText: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.text
  },
  serviceCardSub: {
    marginTop: 3,
    fontSize: 12,
    color: theme.muted
  },
  historyTitle: {
    marginTop: 4
  },
  ongoingTitle: {
    marginTop: 10
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  quickActionGrid: {
    flexDirection: "row",
    gap: 12
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    minHeight: 124,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: theme.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.text
  },
  quickActionBody: {
    marginTop: 5,
    fontSize: 12,
    color: theme.muted,
    lineHeight: 17
  },
  largeActionButton: {
    width: "100%",
    borderRadius: 14,
    height: 50
  },
  ongoingButtonText: {
    fontSize: 18
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 22,
    alignItems: "center"
  },
  modalText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#595959",
    marginVertical: 12
  },
  modalButton: {
    width: "100%",
    height: 46,
    borderRadius: 14,
    marginTop: 10
  },
  modalButtonSecondary: {
    backgroundColor: "#2d8fdb"
  },
  modalButtonText: {
    fontSize: 14
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    alignItems: "flex-end"
  },
  menuPanel: {
    width: 188,
    backgroundColor: theme.surface,
    height: "100%",
    paddingTop: 86,
    paddingHorizontal: 18,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8
  },
  menuItem: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 22
  },
  serviceScreen: {
    flex: 1,
    backgroundColor: theme.bg
  },
  serviceBgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0
  },
  serviceBgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.bg
  },
  profileModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.36)",
    justifyContent: "center",
    padding: 14
  },
  centeredModalBackdrop: {
    alignItems: "center"
  },
  profileModalCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 18,
    maxHeight: "90%"
  },
  profileCloseButton: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 2
  },
  profileTopIcon: {
    width: 88,
    height: 88,
    borderWidth: 0,
    borderRadius: 44,
    backgroundColor: theme.blueSoft,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12
  },
  profileTopIconSmall: {
    width: 82,
    height: 82,
    borderWidth: 0,
    borderRadius: 41,
    backgroundColor: theme.blueSoft,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center"
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.text,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 6
  },
  profileParagraph: {
    fontSize: 13,
    color: "#4d5b68",
    lineHeight: 19,
    marginTop: 12
  },
  profileSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.text,
    marginTop: 14,
    marginBottom: 6
  },
  profileBullet: {
    fontSize: 12,
    color: "#4d5b68",
    lineHeight: 18
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 12,
    marginTop: 8
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6
  },
  reviewName: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.text
  },
  reviewBody: {
    fontSize: 12,
    lineHeight: 18,
    color: "#5a5a5a"
  },
  proceedButton: {
    marginTop: 12,
    alignSelf: "center",
    minWidth: 110,
    height: 44,
    borderRadius: 12
  },
  confirmModalCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    width: "100%"
  },
  confirmQuestion: {
    fontSize: 13,
    color: "#727272",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 10
  },
  confirmActionRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center"
  },
  confirmButton: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 14
  },
  confirmButtonText: {
    fontSize: 13
  },
  sentModalCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    width: "100%"
  },
  requestSentText: {
    fontSize: 14,
    color: "#767676",
    textAlign: "center",
    marginBottom: 12
  },
  sentProceedButton: {
    minWidth: 130,
    height: 44,
    borderRadius: 14,
    alignSelf: "center"
  },
  serviceScroll: {
    paddingHorizontal: Math.min(20, Math.max(14, SCREEN_WIDTH * 0.045)),
    paddingTop: 14,
    paddingBottom: 28
  },
  serviceCardShell: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1
  },
  serviceHeaderPill: {
    backgroundColor: theme.navy,
    borderRadius: 18,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 14
  },
  serviceHeaderIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  serviceHeaderTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    flexShrink: 1
  },
  offeredHeaderBar: {
    backgroundColor: theme.navy,
    borderRadius: 18,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 12
  },
  offeredHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  offeredHeaderText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    flex: 1
  },
  offeredCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },
  offeredCardImage: {
    width: "100%",
    height: 150,
    borderRadius: 14,
    marginBottom: 12
  },
  offeredCardTitle: {
    fontSize: 15,
    color: theme.text,
    fontWeight: "800",
    textAlign: "left"
  },
  formBackIcon: {
    marginTop: 6,
    marginBottom: 12,
    alignSelf: "flex-start"
  },
  requestFieldWrap: {
    marginBottom: 14
  },
  requestFieldLabel: {
    fontSize: 12,
    color: theme.muted,
    marginBottom: 7,
    fontWeight: "800"
  },
  requiredAsterisk: {
    color: "#d12d2d"
  },
  requestInputWrap: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    backgroundColor: "#f9fbfd",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10
  },
  requestInput: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
    minHeight: 44
  },
  pinButton: {
    minHeight: 34,
    borderRadius: 11,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.blueSoft
  },
  pinButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.blueDark
  },
  concernInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    backgroundColor: "#f9fbfd",
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  submitButton: {
    width: "100%",
    borderRadius: 15,
    marginTop: 8,
    height: 50
  },
  formErrorText: {
    color: "#c83434",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8
  },
  providerScroll: {
    paddingHorizontal: Math.min(20, Math.max(14, SCREEN_WIDTH * 0.045)),
    paddingTop: 14,
    paddingBottom: 28
  },
  providerShell: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border
  },
  providerTitleBar: {
    backgroundColor: theme.navy,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    height: 48
  },
  providerTitleBarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800"
  },
  providerIntro: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
    marginBottom: 14
  },
  providerEmptyText: {
    fontSize: 13,
    color: theme.muted,
    lineHeight: 19,
    marginBottom: 12,
    textAlign: "center"
  },
  emptyStateCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fbfe",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 18,
    marginTop: 4
  },
  emptyStateIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.blueSoft,
    marginBottom: 10
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.text,
    textAlign: "center"
  },
  emptyStateBody: {
    marginTop: 5,
    fontSize: 12,
    color: theme.muted,
    lineHeight: 17,
    textAlign: "center"
  },
  providerRow: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  providerIdentity: {
    flexDirection: "row",
    alignItems: "center"
  },
  providerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.blueSoft,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  providerDetails: {
    flex: 1
  },
  providerName: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 3
  },
  starRow: {
    flexDirection: "row",
    gap: 1
  },
  providerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  profileButton: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 13
  },
  sendButton: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 13
  },
  providerButtonText: {
    fontSize: 12
  },
  cancelButton: {
    width: "100%",
    borderRadius: 14,
    marginTop: 8,
    height: 48,
    backgroundColor: theme.navy
  },
  providerBackButton: {
    position: "absolute",
    top: 14,
    left: 12
  },
  statusHeaderPill: {
    backgroundColor: theme.navy,
    borderRadius: 18,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12
  },
  statusCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: 540
  },
  statusBackButton: {
    alignSelf: "flex-start",
    marginBottom: 10
  },
  statusAvatarBox: {
    width: 96,
    height: 96,
    borderRadius: 34,
    backgroundColor: theme.blueSoft,
    borderWidth: 0,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center"
  },
  statusName: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.text,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 4
  },
  statusActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    marginBottom: 18
  },
  statusMiniButton: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 13
  },
  statusMiniText: {
    fontSize: 12
  },
  chatOpenButton: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: theme.navy
  },
  timelineWrap: {
    marginTop: 4
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 64
  },
  timelineLeft: {
    width: 26,
    alignItems: "center"
  },
  timelineDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#cad5df",
    marginTop: 2
  },
  timelineDotActive: {
    backgroundColor: theme.success
  },
  timelineDotCompleted: {
    backgroundColor: "#b8b8b8"
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: "#c9c9c9",
    marginTop: 2
  },
  timelineTextWrap: {
    flex: 1,
    paddingBottom: 8
  },
  timelineLabel: {
    fontSize: 14,
    color: "#758391",
    fontWeight: "800"
  },
  timelineLabelActive: {
    color: theme.success
  },
  timelineLabelCompleted: {
    color: "#808080"
  },
  timelineMeta: {
    fontSize: 11,
    color: theme.muted,
    lineHeight: 16
  },
  proofLink: {
    fontSize: 8,
    color: theme.blueDark,
    textDecorationLine: "underline",
    marginTop: 8,
    marginBottom: 10
  },
  leaveReviewButton: {
    width: "72%",
    alignSelf: "center",
    height: 44,
    borderRadius: 14,
    marginTop: 10
  },
  leaveReviewText: {
    fontSize: 13
  },
  proofTitleButton: {
    alignSelf: "center",
    minWidth: 110,
    height: 44,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 16
  },
  proofViewerButton: {
    alignSelf: "center",
    minWidth: 150,
    height: 44,
    borderRadius: 14,
    marginTop: 12
  },
  proofViewerModalCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    width: "100%",
    maxWidth: 360,
    maxHeight: "85%",
    alignSelf: "center"
  },
  proofViewerScroll: {
    gap: 12,
    paddingVertical: 10
  },
  proofViewerImage: {
    width: "100%",
    height: 240,
    borderRadius: 10,
    backgroundColor: "#eef3f8"
  },
  fullscreenProofBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18
  },
  fullscreenProofClose: {
    position: "absolute",
    top: 52,
    right: 18,
    zIndex: 2
  },
  fullscreenProofImage: {
    width: "100%",
    height: "82%"
  },
  proofImage: {
    width: "100%",
    height: 140,
    borderRadius: 6,
    marginTop: 18
  },
  statusDoneButton: {
    alignSelf: "center",
    width: "72%",
    height: 44,
    borderRadius: 14,
    marginTop: 10
  },
  historyEntryCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 18
  },
  historyEntryTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.blue,
    textAlign: "left",
    marginBottom: 10
  },
  historyEntryInner: {
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f9fbfd"
  },
  historyEntryTop: {
    flexDirection: "row",
    gap: 10
  },
  providerAvatarLarge: {
    width: 64,
    height: 64,
    borderWidth: 0,
    borderRadius: 22,
    backgroundColor: theme.blueSoft,
    justifyContent: "center",
    alignItems: "center"
  },
  providerAvatarXLarge: {
    width: 96,
    height: 96,
    borderWidth: 0,
    borderRadius: 34,
    backgroundColor: theme.blueSoft,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 10
  },
  historyProviderMeta: {
    flex: 1
  },
  historyProviderName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#242424"
  },
  historyProviderSmall: {
    fontSize: 11,
    color: theme.muted,
    lineHeight: 16
  },
  historyComplete: {
    color: "#30c033",
    fontWeight: "700"
  },
  historyEntryButton: {
    height: 44,
    borderRadius: 14,
    alignSelf: "center",
    marginTop: 12,
    minWidth: 120
  },
  historyEntryButtonText: {
    fontSize: 12
  },
  historyProofImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginTop: 12
  },
  ongoingCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border
  },
  ongoingCardTitle: {
    fontSize: 22,
    color: theme.blue,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10
  },
  ongoingInner: {
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#f9fbfd"
  },
  ongoingName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#242424",
    textAlign: "center",
    marginBottom: 10
  },
  ongoingStatusButton: {
    height: 44,
    borderRadius: 14,
    alignSelf: "center",
    minWidth: 145
  },
  reviewFormCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border
  },
  reviewFormTitle: {
    fontSize: 20,
    color: theme.blue,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10
  },
  reviewServiceTop: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10
  },
  reviewLabel: {
    fontSize: 13,
    color: theme.muted,
    marginTop: 10,
    marginBottom: 8,
    fontWeight: "800"
  },
  reviewCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10
  },
  reviewCheckboxText: {
    fontSize: 13,
    color: theme.muted
  },
  reviewInput: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    backgroundColor: "#f9fbfd",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.text
  },
  reviewSubmitButton: {
    alignSelf: "center",
    minWidth: 118,
    height: 44,
    borderRadius: 14,
    marginTop: 16
  },
  reviewPostedCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    minHeight: 180,
    justifyContent: "center"
  },
  reviewPostedText: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
    marginTop: 18,
    marginBottom: 24
  },
  reviewPostedButton: {
    alignSelf: "center",
    minWidth: 120,
    height: 44,
    borderRadius: 14
  },
  completionModalCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    width: "100%",
    maxWidth: 340,
    alignSelf: "center"
  },
  proofGalleryRow: {
    gap: 10,
    paddingVertical: 4
  },
  proofThumbWrap: {
    position: "relative"
  },
  proofRemoveButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff"
  },
  proofGalleryImage: {
    width: 130,
    height: 130,
    borderRadius: 8
  },
  completionPreviewImage: {
    width: 110,
    height: 110,
    borderRadius: 8
  },
  completionErrorText: {
    fontSize: 11,
    color: "#c74242",
    textAlign: "center",
    marginTop: 10
  },
  profilePhotoWrap: {
    alignItems: "center",
    marginBottom: 12
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60
  },
  profileImageLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignSelf: "center",
    marginTop: 12
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.blueSoft,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0
  },
  rescheduleTimeWrap: {
    marginTop: 10
  },
  equalButtonColumn: {
    width: "100%",
    gap: 10,
    marginTop: 14
  },
  equalActionButton: {
    width: "100%",
    height: 44,
    borderRadius: 14
  },
  equalActionButtonSecondary: {
    backgroundColor: theme.blueDark
  },
  myReviewCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border
  },
  workerHero: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  workerHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14
  },
  workerHeroEyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.blueDark,
    marginBottom: 6
  },
  workerHeroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.text,
    flexShrink: 1
  },
  workerHeroSub: {
    marginTop: 4,
    fontSize: 14,
    color: "#4d5b68",
    lineHeight: 20
  },
  workerHeroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: theme.blueSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  workerBioText: {
    marginTop: 14,
    fontSize: 13,
    color: "#4d5b68",
    lineHeight: 19
  },
  liveStatusPill: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eaf8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  liveStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.success
  },
  liveStatusText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#177344"
  },
  workerStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  workerStatCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  workerStatNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.blue
  },
  workerStatLabel: {
    fontSize: 11,
    color: "#4f4f4f",
    marginTop: 4
  },
  workerPanel: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  panelHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  workerPanelTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.blue,
    marginBottom: 10
  },
  workerPanelText: {
    fontSize: 14,
    color: "#4d5b68",
    lineHeight: 20,
    marginBottom: 12
  },
  guideCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 14
  },
  guideCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.blueDark,
    marginBottom: 10
  },
  guideCardItem: {
    fontSize: 14,
    color: "#4f4f4f",
    lineHeight: 20,
    marginBottom: 8
  },
  aboutMemberCard: {
    backgroundColor: "#f8fbfe",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 10
  },
  aboutMemberName: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.text
  },
  aboutMemberRole: {
    marginTop: 4,
    fontSize: 12,
    color: theme.blueDark,
    fontWeight: "700",
    lineHeight: 17
  },
  chatInboxHeader: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border
  },
  chatInboxTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.text
  },
  chatInboxSub: {
    marginTop: 6,
    fontSize: 13,
    color: theme.muted,
    lineHeight: 19
  },
  chatThreadCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  chatThreadAvatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: theme.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  chatThreadBody: {
    flex: 1
  },
  chatThreadTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  chatThreadName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: theme.text
  },
  chatThreadTime: {
    fontSize: 10,
    color: theme.muted
  },
  chatThreadPreview: {
    marginTop: 4,
    fontSize: 13,
    color: theme.muted
  },
  chatUnreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.blue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8
  },
  chatUnreadText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900"
  },
  chatScreen: {
    flex: 1,
    backgroundColor: "#eef4f8"
  },
  chatHeader: {
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  chatBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  chatHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.blueSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  chatHeaderTextWrap: {
    flex: 1
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.text
  },
  chatHeaderSub: {
    marginTop: 2,
    fontSize: 12,
    color: theme.muted
  },
  chatMessagesContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 20
  },
  chatMessageRow: {
    width: "100%",
    marginBottom: 10
  },
  chatMessageRowMine: {
    alignItems: "flex-end"
  },
  chatMessageRowOther: {
    alignItems: "flex-start"
  },
  chatBubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 10
  },
  chatBubbleMine: {
    backgroundColor: theme.blue,
    borderBottomRightRadius: 6
  },
  chatBubbleOther: {
    backgroundColor: theme.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: theme.border
  },
  chatBubbleText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.text
  },
  chatBubbleTextMine: {
    color: "#fff"
  },
  chatImage: {
    width: Math.min(220, SCREEN_WIDTH * 0.58),
    height: Math.min(220, SCREEN_WIDTH * 0.58),
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: theme.border
  },
  chatMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 7,
    marginTop: 5
  },
  chatTimeText: {
    fontSize: 10,
    color: theme.muted
  },
  chatTimeTextMine: {
    color: "rgba(255,255,255,0.78)"
  },
  chatStatusText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.88)",
    fontWeight: "800"
  },
  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 2
  },
  typingText: {
    fontSize: 12,
    color: theme.muted,
    fontWeight: "700"
  },
  chatComposerWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border
  },
  chatImageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.blueSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  chatInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "#f5f8fb",
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text
  },
  chatSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.blue,
    alignItems: "center",
    justifyContent: "center"
  },
  chatSendButtonDisabled: {
    backgroundColor: "#a9c7dd"
  },
  workerActionButton: {
    width: "100%",
    height: 46,
    borderRadius: 14,
    marginTop: 6
  },
  workerSecondaryButton: {
    width: "100%",
    height: 46,
    borderRadius: 14,
    marginTop: 8,
    backgroundColor: theme.blueDark
  },
  workerRequestCard: {
    backgroundColor: "#f9fbfd",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12
  },
  workerRequestTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  workerRequestName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#202020"
  },
  workerRequestBadge: {
    fontSize: 10,
    textTransform: "uppercase",
    color: "#fff",
    backgroundColor: theme.blue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99
  },
  countBadge: {
    minWidth: 30,
    textAlign: "center",
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "900",
    color: theme.blueDark,
    backgroundColor: theme.blueSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8
  },
  workerRequestText: {
    fontSize: 13,
    color: "#4d5b68",
    lineHeight: 19
  },
  workerDetailLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.blueDark,
    marginTop: 10,
    marginBottom: 4
  },
  workerDetailValue: {
    fontSize: 14,
    color: "#3d3d3d",
    lineHeight: 18
  },
  workerHistoryProofImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginTop: 12
  },
  notificationCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12
  },
  notificationCardUnread: {
    borderColor: theme.blue,
    backgroundColor: "#f2f8ff"
  },
  notificationTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: theme.blueDark,
    paddingRight: 8
  },
  notificationUnreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f24444"
  },
  notificationBody: {
    fontSize: 13,
    color: "#525252",
    lineHeight: 18
  },
  notificationTime: {
    marginTop: 10,
    fontSize: 10,
    color: "#7a7a7a"
  }, // <-- ADD THIS COMMA FIRST!

  // THEN PASTE ALL THE NEW STYLES HERE:
  paymentBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  paymentSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400
  },
  paymentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.text
  },
  paymentSummaryCard: {
    backgroundColor: theme.blueSoft,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 24
  },
  paymentSummaryLabel: {
    fontSize: 12,
    color: theme.blueDark,
    fontWeight: "700"
  },
  paymentSummaryAmount: {
    fontSize: 32,
    fontWeight: "900",
    color: theme.navy,
    marginVertical: 4
  },
  paymentSummaryDetail: {
    fontSize: 12,
    color: theme.blueDark
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 12
  },
  paymentMethodCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    marginBottom: 10
  },
  paymentMethodIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  paymentMethodText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: theme.text
  },
  paymentConfirmButton: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    marginTop: 10,
    backgroundColor: theme.blue
  },
  paymentSuccessContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40
  },
  paymentSuccessTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.success,
    marginTop: 16,
    marginBottom: 8
  },
  paymentSuccessText: {
    fontSize: 14,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 20
  }
}); // <-- THIS IS THE ABSOLUTE LAST LINE OF YOUR FILE
