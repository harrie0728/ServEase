import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { onAuthStateChanged } from "firebase/auth";
import { signInWithFirebase, signOutFromFirebase, signUpWithFirebase } from "./src/firebase/auth";
import { auth } from "./src/firebase/config";
import { getRequestsForProvider, updateProviderRequestStatus } from "./src/firebase/providerRequests";
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
import { uploadProfilePhoto, uploadProofPhoto } from "./src/firebase/storage";

const theme = {
  blue: "#1f7fc7",
  blueDark: "#115d9c",
  blueSoft: "#dfeeff",
  yellow: "#f7c51e",
  text: "#101010",
  muted: "#6d6d6d",
  surface: "#ffffff",
  bg: "#f5f5f5",
  border: "#d7dce1",
  cardBorder: "#c7c7c7"
};

const SCREEN_WIDTH = Dimensions.get("window").width;

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
  "a reliable and experienced plumber with a strong background in residential and commercial plumbing systems. He is known for delivering high-quality workmanship, ensuring that all installations, repairs, and maintenance tasks are completed efficiently and safely.";

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
  const tile = size / 2.35;
  const radius = tile * 0.24;
  const iconSize = tile * 0.55;

  return (
    <View style={[styles.logoGrid, { width: size, height: size }]}>
      <View
        style={[
          styles.logoTile,
          {
            width: tile,
            height: tile,
            borderRadius: radius,
            backgroundColor: theme.blue,
            top: 0,
            left: size * 0.25
          }
        ]}
      >
        <MaterialCommunityIcons name="lightning-bolt-circle" size={iconSize} color="#fff" />
      </View>
      <View
        style={[
          styles.logoTile,
          {
            width: tile,
            height: tile,
            borderRadius: radius,
            backgroundColor: theme.yellow,
            top: size * 0.25,
            left: 0
          }
        ]}
      >
        <MaterialCommunityIcons name="cctv" size={iconSize} color="#fff" />
      </View>
      <View
        style={[
          styles.logoTile,
          {
            width: tile,
            height: tile,
            borderRadius: radius,
            backgroundColor: theme.yellow,
            top: size * 0.25,
            right: 0
          }
        ]}
      >
        <MaterialCommunityIcons name="water-outline" size={iconSize} color="#fff" />
      </View>
      <View
        style={[
          styles.logoTile,
          {
            width: tile,
            height: tile,
            borderRadius: radius,
            backgroundColor: theme.blue,
            bottom: 0,
            left: size * 0.25
          }
        ]}
      >
        <MaterialCommunityIcons name="solar-power" size={iconSize} color="#fff" />
      </View>
    </View>
  );
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
    <ScrollView contentContainerStyle={styles.authScreen}>
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
  );
}

function SignUpScreen({ onSignUp, onGoSignIn, values, onChangeText, errorMessage, isLoading }) {
  return (
    <ScrollView contentContainerStyle={styles.authScreen}>
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
  );
}

function HeaderArea({ mutedBell = false, onMenuPress, onBellPress }) {
  return (
    <LinearGradient colors={["#134f80", "#2c85c6", "#87bee9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerArea}>
      <Image source={{ uri: featuredImages.hero }} style={styles.heroImage} />
      <View style={styles.headerOverlay} />
      <View style={styles.headerIcons}>
        <Pressable onPress={onBellPress}>
          <Ionicons name={mutedBell ? "notifications-off-outline" : "notifications-outline"} size={24} color="#fff" />
        </Pressable>
        <Pressable onPress={onMenuPress}>
          <Feather name="menu" size={24} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.guidePill}>
        <Ionicons name="book-outline" size={18} color="#0ea7a0" />
        <Text style={styles.guideText}>Manual/Guide</Text>
      </View>
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
        <Pressable key={item.detail} style={styles.serviceCard} onPress={() => onSelect(item.key)}>
          <View style={styles.serviceIconBox}>
            <Ionicons name={item.icon} size={28} color={theme.blueDark} />
          </View>
          <Text style={styles.serviceCardText}>{item.detail}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function DashboardScreen({
  mutedBell = false,
  showLocationModal = false,
  menuVisible = false,
  onEnableLocation,
  onLater,
  onToggleBell,
  onOpenService,
  onOpenOffer,
  onOpenHistory,
  onOpenOngoing,
  onMenuPress,
  onCloseMenu,
  onOpenProfile,
  onSignOut
}) {
  const menuSlide = useRef(new Animated.Value(180)).current;

  useEffect(() => {
    Animated.timing(menuSlide, {
      toValue: menuVisible ? 0 : 180,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [menuSlide, menuVisible]);

  return (
    <View style={styles.dashboardScreen}>
      <HeaderArea mutedBell={mutedBell} onBellPress={onToggleBell} onMenuPress={onMenuPress} />
      <ScrollView contentContainerStyle={styles.dashboardContent}>
        <FeaturedCarousel />
        <Text style={styles.sectionTitle}>Offered Services</Text>
        <ShortcutGrid onSelect={onOpenOffer} />
        <ServiceList onSelect={onOpenService} />
        <Text style={[styles.sectionTitle, styles.historyTitle]}>View Request History</Text>
        <View style={styles.historyCard}>
          <PrimaryButton title="VIEW HISTORY" onPress={onOpenHistory} style={styles.largeActionButton} />
        </View>
        <Text style={[styles.sectionTitle, styles.ongoingTitle]}>On-going Request</Text>
        <View style={styles.historyCard}>
          <PrimaryButton title="View On-going Request" onPress={onOpenOngoing} style={styles.largeActionButton} textStyle={styles.ongoingButtonText} />
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
            <Text style={styles.menuItem}>About us</Text>
            <Text style={styles.menuItem}>Rate us</Text>
            <Text style={styles.menuItem}>Help center</Text>
            <Pressable onPress={onSignOut}>
              <Text style={styles.menuItem}>Sign out</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ServiceFormScreen({ service, onBack, onSubmit, values, onChangeText, errorMessage, onOpenDate, onOpenTime }) {
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
                {field.icon ? (
                  <Pressable onPress={field.key === "date" ? onOpenDate : field.key === "time" ? onOpenTime : undefined}>
                    <Ionicons name={field.icon} size={20} color="#7d7d7d" />
                  </Pressable>
                ) : null}
              </View>
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

function StarRating({ size = 16, filled = 3 }) {
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
          <Ionicons name="person-outline" size={34} color="#2e2e2e" />
        </View>
        <View style={styles.providerDetails}>
          <Text style={styles.providerName}>{provider.name}</Text>
          <StarRating />
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

function ProofPhotoGallery({ photos = [], imageStyle, emptyText }) {
  if (!photos.length) {
    return emptyText ? <Text style={styles.providerEmptyText}>{emptyText}</Text> : null;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.proofGalleryRow}>
      {photos.map((photo, index) => (
        <Image key={`${typeof photo === "string" ? photo : photo?.uri}-${index}`} source={{ uri: typeof photo === "string" ? photo : photo?.uri }} style={imageStyle || styles.proofGalleryImage} />
      ))}
    </ScrollView>
  );
}

function CompletionProofModal({ visible, photos, errorMessage, onPickPhotos, onClose, onSubmit, isSubmitting }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.profileModalBackdrop}>
        <AnimatedPopup style={styles.completionModalCard}>
          <Text style={styles.reviewFormTitle}>Proof of Service</Text>
          <Text style={styles.reviewPostedText}>Upload up to 3 finished-work photos before marking this request as completed.</Text>
          <ProofPhotoGallery photos={photos} imageStyle={styles.completionPreviewImage} emptyText="No proof photos selected yet." />
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
  onDone
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
          {activeStep !== "proof" ? (
            <>
              <View style={styles.statusActionRow}>
                <PrimaryButton title="Reschedule" onPress={onReschedule} style={styles.statusMiniButton} textStyle={styles.statusMiniText} disabled={activeStep === "completed" || activeStep === "cancelled"} />
                <PrimaryButton title="Cancel" onPress={onCancel} style={styles.statusMiniButton} textStyle={styles.statusMiniText} disabled={disableCancel} />
              </View>
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
              {activeStep === "completed" ? (
                <>
                  <Pressable onPress={onProof}>
                    <Text style={styles.proofLink}>View proof of service</Text>
                  </Pressable>
                  <PrimaryButton title="LEAVE A REVIEW" onPress={onLeaveReview} style={styles.leaveReviewButton} textStyle={styles.leaveReviewText} />
                </>
              ) : null}
              {activeStep === "cancelled" ? <Text style={styles.providerEmptyText}>This request has been cancelled.</Text> : null}
              <PrimaryButton title="DONE" onPress={onDone} style={styles.statusDoneButton} textStyle={styles.historyEntryButtonText} />
            </>
          ) : (
            <>
              <PrimaryButton title="Proof of Service" onPress={() => {}} style={styles.proofTitleButton} textStyle={styles.statusMiniText} />
              <ProofPhotoGallery photos={request?.proofPhotos || []} imageStyle={styles.proofImage} emptyText="No proof photos uploaded yet." />
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
        <ProofPhotoGallery photos={request?.proofPhotos || []} imageStyle={isWorkerHistory ? styles.workerHistoryProofImage : styles.historyProofImage} />
      </View>
    </View>
  );
}

function HistoryScreen({ onBack, completedRequest, pendingReviewRequest, onViewMyReview, onLeaveReview }) {
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <Pressable onPress={onBack} style={styles.formBackIcon}>
          <Ionicons name="arrow-back-circle-outline" size={28} color="#1f1f1f" />
        </Pressable>
        {completedRequest ? <HistoryEntry title="History" buttonTitle="View my Review" onPress={onViewMyReview} request={completedRequest} /> : null}
        {pendingReviewRequest ? <HistoryEntry title="Pending Review" buttonTitle="Leave a Review" onPress={onLeaveReview} request={pendingReviewRequest} /> : null}
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
  onDeleteAccount
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
            <PrimaryButton title="Upload Profile Picture" onPress={onPickPhoto} style={styles.workerActionButton} textStyle={styles.historyEntryButtonText} />
          ) : (
            <Text style={styles.providerEmptyText}>Profile picture updates for workers are managed by the web developer.</Text>
          )}
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

function ProviderDashboardScreen({ profile, requests, loading, onOpenRequests, onOpenHistory, onOpenProfile, onSignOut }) {
  const historyCount = requests.filter((item) => ["completed", "cancelled"].includes(item.status)).length;
  const activeCount = requests.filter((item) => !["completed", "cancelled"].includes(item.status)).length;
  return (
    <View style={styles.serviceScreen}>
      <Image source={{ uri: featuredImages.formBg }} style={styles.serviceBgImage} />
      <View style={styles.serviceBgOverlay} />
      <ScrollView contentContainerStyle={styles.serviceScroll}>
        <View style={styles.workerHero}>
          <Text style={styles.workerHeroEyebrow}>Worker Dashboard</Text>
          <Text style={styles.workerHeroTitle}>Provider</Text>
          {profile?.photoURL ? <Image source={{ uri: profile.photoURL }} style={styles.profileImageLarge} /> : null}
          <Text style={styles.workerHeroSub}>{profile?.displayName || "Harrie Abel"}</Text>
          <Text style={styles.workerHeroSub}>{profile?.email || SPECIAL_WORKER_EMAIL}</Text>
          <Text style={styles.workerHeroSub}>{profile?.bio || "No bio yet."}</Text>
          <PrimaryButton title="MY PROFILE" onPress={onOpenProfile} style={styles.workerActionButton} textStyle={styles.historyEntryButtonText} />
        </View>

        <View style={styles.workerPanel}>
          <Text style={styles.workerPanelTitle}>My Service Jobs</Text>
          <Text style={styles.workerPanelText}>
            {loading
              ? "Loading requests..."
              : `You currently have ${activeCount} active request(s) across: ${(profile?.serviceTypes || ["plumbing"]).join(", ")}.`}
          </Text>
          <PrimaryButton title="VIEW REQUESTS" onPress={onOpenRequests} style={styles.workerActionButton} textStyle={styles.historyEntryButtonText} />
        </View>

        <View style={styles.workerPanel}>
          <Text style={styles.workerPanelTitle}>History</Text>
          <Text style={styles.workerPanelText}>
            {loading ? "Loading history..." : historyCount > 0 ? `You have ${historyCount} completed or cancelled request(s) in history.` : "Empty history."}
          </Text>
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
          <Text style={styles.workerPanelTitle}>My Service Jobs</Text>
          <Text style={styles.workerPanelText}>{loading ? "Loading..." : `${activeRequests.length} active request(s) found.`}</Text>
        </View>

        {sections.map((section) => {
          const sectionRequests = activeRequests.filter((item) => item.serviceKey === section.key);
          return (
            <View key={section.key} style={styles.workerPanel}>
              <Text style={styles.workerPanelTitle}>{section.title}</Text>
              {sectionRequests.length ? (
                sectionRequests.map((request) => (
                  <Pressable key={request.id} style={styles.workerRequestCard} onPress={() => onOpenRequest(request)}>
                    <View style={styles.workerRequestTop}>
                      <Text style={styles.workerRequestName}>{request.customerName || "Unknown Customer"}</Text>
                      <Text style={styles.workerRequestBadge}>{request.status || "requested"}</Text>
                    </View>
                    <Text style={styles.workerRequestText}>{request.location || "No location"}</Text>
                    <Text style={styles.workerRequestText}>{request.concern || "No concern provided"}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.providerEmptyText}>No active requests.</Text>
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
          <Text style={styles.workerPanelTitle}>History</Text>
          <Text style={styles.workerPanelText}>{loading ? "Loading..." : `${historyRequests.length} history request(s) found.`}</Text>
        </View>
        {historyRequests.map((request) => (
          <HistoryEntry key={request.id} title={request.serviceLabel || "History"} buttonTitle="View Details" onPress={() => onOpenRequest(request)} request={request} isWorkerHistory />
        ))}
        {!loading && historyRequests.length === 0 ? <Text style={styles.providerEmptyText}>Empty history.</Text> : null}
      </ScrollView>
    </View>
  );
}

function ProviderRequestDetailScreen({ request, onBack, onUpdateStatus, onCancelRequest }) {
  const nextActionMap = {
    requested: "Accept Request",
    accepted: "Mark On The Way",
    "on-the-way": "Start Service",
    started: "Mark Completed",
    completed: "Completed"
  };

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
          <PrimaryButton
            title={nextActionMap[request.status] || "Update"}
            onPress={onUpdateStatus}
            style={styles.workerActionButton}
            textStyle={styles.historyEntryButtonText}
            disabled={request.status === "completed"}
          />
          <PrimaryButton
            title="Cancel Request"
            onPress={onCancelRequest}
            style={styles.workerSecondaryButton}
            textStyle={styles.historyEntryButtonText}
            disabled={["on-the-way", "started", "completed", "cancelled"].includes(request.status)}
          />
          <ProofPhotoGallery photos={request.proofPhotos || []} imageStyle={styles.workerHistoryProofImage} />
        </View>
      </ScrollView>
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState("start");
  const [navDirection, setNavDirection] = useState("forward");
  const [locationPromptVisible, setLocationPromptVisible] = useState(true);
  const [mutedBell, setMutedBell] = useState(false);
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
  const [newAccountName, setNewAccountName] = useState("");
  const [requestForm, setRequestForm] = useState(emptyRequestForm);
  const [requestError, setRequestError] = useState("");
  const [datePickerField, setDatePickerField] = useState(null);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
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
  const pageTranslate = useRef(new Animated.Value(0)).current;

  const selectedService = serviceShortcuts.find((item) => item.key === selectedServiceKey) || serviceShortcuts[0];
  const selectedProvider =
    providerOptions.find((provider) => provider.name === selectedProviderName) ||
    selectedService.providers.find((provider) => provider.name === selectedProviderName) ||
    providerOptions[0] ||
    selectedService.providers[0];

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
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const uri = asset?.uri;
    if (!uri) return;

    const uploadedUrl = await uploadProfilePhoto(currentUser.uid, asset);
    await updateUserProfile(currentUser.uid, { photoURL: uploadedUrl });
    setCurrentUserProfile((current) => ({ ...current, photoURL: uploadedUrl }));
    setProfileForm((current) => ({ ...current, photoURL: uploadedUrl }));
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

  const handleReschedule = async () => {
    if (!selectedCustomerRequest) return;
    if (!rescheduleForm.preferredDate || !rescheduleForm.preferredTime) return;
    await updateCustomerRequestSchedule(selectedCustomerRequest.id, rescheduleForm);
    await loadCustomerRequests(currentUser.uid);
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
      quality: 0.8,
      base64: true
    });

    if (result.canceled) return;

    const pickedPhotos = (result.assets || []).filter((item) => item?.uri).slice(0, 3);
    setCompletionProofError("");
    setCompletionProofPhotos(pickedPhotos);
  };

  const submitCompletionProof = async () => {
    if (!selectedWorkerRequest || !currentUser || completionProofPhotos.length === 0) return;

    try {
      setCompletionSubmitting(true);
      setCompletionProofError("");
      const uploadedPhotos = [];
      for (const asset of completionProofPhotos.slice(0, 3)) {
        const uploadedUrl = await uploadProofPhoto(selectedWorkerRequest.id, asset);
        uploadedPhotos.push(uploadedUrl);
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
    Animated.timing(pageTranslate, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [navDirection, pageTranslate, screen]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const hydrateUser = async () => {
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
          setOngoingRequest(null);
          setSelectedWorkerRequest(null);
          setNamePromptVisible(false);
          setScreen((current) => (current !== "start" && current !== "signin" && current !== "signup" ? "signin" : current));
        }

        setAuthReady(true);
      };

      hydrateUser();
    });

    return unsubscribe;
  }, []);

  if (!authReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingText}>Loading ServEase...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
      <Animated.View style={[styles.pageTransitionWrap, { transform: [{ translateX: pageTranslate }] }]}>
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
            mutedBell={mutedBell}
            showLocationModal={locationPromptVisible}
            onEnableLocation={() => setLocationPromptVisible(false)}
            onLater={() => setLocationPromptVisible(false)}
            onToggleBell={() => setMutedBell((value) => !value)}
            onOpenService={openServiceForm}
            onOpenOffer={openOfferedServices}
            onOpenHistory={openHistory}
            onOpenOngoing={openOngoing}
            onMenuPress={() => setMenuVisible(true)}
            onCloseMenu={() => setMenuVisible(false)}
            onOpenProfile={() => {
              setMenuVisible(false);
              navigateTo("profile", "forward");
            }}
            menuVisible={menuVisible}
            onSignOut={async () => {
              setMenuVisible(false);
              await signOutFromFirebase();
              navigateTo("signin", "back");
            }}
          />
        )}
        {screen === "provider-dashboard" && (
          <ProviderDashboardScreen
            profile={currentUserProfile}
            requests={providerRequests}
            loading={providerRequestsLoading}
            onOpenRequests={openProviderRequests}
            onOpenHistory={openProviderHistory}
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
        />
      )}
      {screen === "history" && (
          <HistoryScreen
            onBack={goBackToDashboard}
            completedRequest={completedRequest}
            pendingReviewRequest={pendingReviewRequest}
            onViewMyReview={() => completedRequest && navigateTo("my-review", "forward")}
            onLeaveReview={() => pendingReviewRequest && openReviewForRequest(pendingReviewRequest)}
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
        onClose={() => {
          if (completionSubmitting) return;
          setCompletionProofVisible(false);
          setCompletionProofPhotos([]);
          setCompletionProofError("");
        }}
        onSubmit={submitCompletionProof}
        isSubmitting={completionSubmitting}
      />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg
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
    fontSize: 18,
    fontWeight: "700",
    color: theme.blueDark
  },
  startScreen: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.bg,
    paddingHorizontal: 24,
    paddingBottom: 44
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
    fontSize: 30,
    fontWeight: "800",
    color: theme.text,
    letterSpacing: 0.6,
    marginTop: 18
  },
  brandNameCompact: {
    fontSize: 24,
    marginTop: 12
  },
  brandTag: {
    fontSize: 12,
    color: theme.muted,
    letterSpacing: 4,
    textTransform: "lowercase",
    marginTop: 6
  },
  primaryButton: {
    minWidth: 140,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.blue,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
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
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  getStartedButton: {
    minWidth: 142,
    height: 34,
    borderRadius: 18
  },
  getStartedText: {
    fontSize: 14
  },
  authScreen: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
    gap: 24,
    backgroundColor: theme.bg
  },
  authCard: {
    width: "100%",
    backgroundColor: theme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cfd5db",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3
  },
  authHeader: {
    backgroundColor: theme.blue,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8
  },
  authHeaderText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 22
  },
  fieldWrap: {
    paddingHorizontal: 12,
    paddingTop: 12
  },
  fieldLabel: {
    color: "#3c3c3c",
    fontSize: 12,
    marginBottom: 4
  },
  fieldInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#bcc4cb",
    borderRadius: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 10
  },
  authButton: {
    alignSelf: "center",
    marginTop: 16,
    minWidth: 92,
    height: 34,
    borderRadius: 10
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10
  },
  authFooterText: {
    fontSize: 10,
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
    height: 210,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingTop: 12
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9,30,54,0.25)"
  },
  headerIcons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 18
  },
  guidePill: {
    marginTop: 110,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eef1ff",
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18
  },
  guideText: {
    color: "#4f4f4f",
    fontWeight: "600"
  },
  dashboardContent: {
    paddingHorizontal: 14,
    paddingBottom: 28
  },
  featuredFrame: {
    marginTop: -18
  },
  featuredTrack: {
    gap: 14,
    paddingHorizontal: 2,
    paddingTop: 12
  },
  featureImage: {
    width: 250,
    height: 120,
    borderRadius: 14
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
    fontSize: 13,
    fontWeight: "700",
    color: theme.text,
    marginTop: 14,
    marginBottom: 10
  },
  shortcutsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  shortcutCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#e8efff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 4
  },
  shortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6
  },
  shortcutLabel: {
    fontSize: 10,
    textAlign: "center",
    fontWeight: "700",
    color: theme.text
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    padding: 10,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },
  serviceIconBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: theme.blue,
    alignItems: "center",
    justifyContent: "center"
  },
  serviceCardText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.text
  },
  historyTitle: {
    marginTop: 4
  },
  ongoingTitle: {
    marginTop: 10
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  largeActionButton: {
    width: "100%",
    borderRadius: 8,
    height: 48
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
    borderRadius: 14,
    padding: 18,
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
    height: 40,
    borderRadius: 8,
    marginTop: 8
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
    width: 138,
    backgroundColor: "#3f3b3a",
    height: "100%",
    paddingTop: 88,
    paddingHorizontal: 18
  },
  menuItem: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 14
  },
  serviceScreen: {
    flex: 1,
    backgroundColor: "#58748c"
  },
  serviceBgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35
  },
  serviceBgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(32,63,89,0.42)"
  },
  profileModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.36)",
    justifyContent: "center",
    padding: 14
  },
  profileModalCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    maxHeight: "90%"
  },
  profileCloseButton: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 2
  },
  profileTopIcon: {
    width: 78,
    height: 78,
    borderWidth: 1,
    borderColor: "#b7b7b7",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12
  },
  profileTopIconSmall: {
    width: 78,
    height: 78,
    borderWidth: 1,
    borderColor: "#b7b7b7",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center"
  },
  profileName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 6
  },
  profileParagraph: {
    fontSize: 8,
    color: "#505050",
    lineHeight: 11,
    marginTop: 10
  },
  profileSectionTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: theme.text,
    marginTop: 10,
    marginBottom: 4
  },
  profileBullet: {
    fontSize: 8,
    color: "#505050",
    lineHeight: 11
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: "#b9b9b9",
    borderRadius: 8,
    padding: 8,
    marginTop: 8
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6
  },
  reviewName: {
    fontSize: 8,
    fontWeight: "700",
    color: theme.text
  },
  reviewBody: {
    fontSize: 7,
    lineHeight: 10,
    color: "#5a5a5a"
  },
  proceedButton: {
    marginTop: 12,
    alignSelf: "center",
    minWidth: 110,
    height: 34,
    borderRadius: 8
  },
  confirmModalCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14
  },
  confirmQuestion: {
    fontSize: 9,
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
    minWidth: 92,
    height: 28,
    borderRadius: 7
  },
  confirmButtonText: {
    fontSize: 10
  },
  sentModalCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16
  },
  requestSentText: {
    fontSize: 9,
    color: "#767676",
    textAlign: "center",
    marginBottom: 12
  },
  sentProceedButton: {
    minWidth: 110,
    height: 28,
    borderRadius: 7,
    alignSelf: "center"
  },
  serviceScroll: {
    padding: 12
  },
  serviceCardShell: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#9aa6b1"
  },
  serviceHeaderPill: {
    backgroundColor: theme.blue,
    borderRadius: 8,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  serviceHeaderIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  serviceHeaderTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700"
  },
  offeredHeaderBar: {
    backgroundColor: theme.blue,
    borderRadius: 8,
    height: 46,
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
    fontSize: 16,
    fontWeight: "800",
    flex: 1
  },
  offeredCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },
  offeredCardImage: {
    width: "100%",
    height: 110,
    borderRadius: 2,
    marginBottom: 10
  },
  offeredCardTitle: {
    fontSize: 12,
    color: "#333",
    fontWeight: "700",
    textAlign: "center"
  },
  formBackIcon: {
    marginTop: 12,
    marginBottom: 6,
    alignSelf: "flex-start"
  },
  requestFieldWrap: {
    marginBottom: 10
  },
  requestFieldLabel: {
    fontSize: 10,
    color: "#545454",
    marginBottom: 4,
    fontWeight: "700"
  },
  requiredAsterisk: {
    color: "#d12d2d"
  },
  requestInputWrap: {
    height: 36,
    borderWidth: 1,
    borderColor: "#9f9f9f",
    borderRadius: 4,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10
  },
  requestInput: {
    flex: 1,
    fontSize: 10,
    color: theme.text
  },
  concernInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#9f9f9f",
    borderRadius: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  submitButton: {
    width: "100%",
    borderRadius: 6,
    marginTop: 8
  },
  formErrorText: {
    color: "#c83434",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8
  },
  providerScroll: {
    padding: 12
  },
  providerShell: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#8e98a1"
  },
  providerTitleBar: {
    backgroundColor: theme.blue,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    height: 32
  },
  providerTitleBarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700"
  },
  providerIntro: {
    color: "#717171",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 10,
    marginBottom: 10
  },
  providerEmptyText: {
    fontSize: 11,
    color: "#666",
    lineHeight: 18,
    marginBottom: 12,
    textAlign: "center"
  },
  providerRow: {
    borderWidth: 1,
    borderColor: theme.cardBorder,
    backgroundColor: "#fff",
    padding: 8,
    marginBottom: 10
  },
  providerIdentity: {
    flexDirection: "row",
    alignItems: "center"
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: "#a4a4a4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  providerDetails: {
    flex: 1
  },
  providerName: {
    fontSize: 12,
    fontWeight: "700",
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
    marginTop: 8
  },
  profileButton: {
    flex: 1,
    minWidth: 0,
    height: 26,
    borderRadius: 5
  },
  sendButton: {
    flex: 1,
    minWidth: 0,
    height: 26,
    borderRadius: 5
  },
  providerButtonText: {
    fontSize: 9
  },
  cancelButton: {
    width: "100%",
    borderRadius: 6,
    marginTop: 6
  },
  providerBackButton: {
    position: "absolute",
    top: 14,
    left: 12
  },
  statusHeaderPill: {
    backgroundColor: theme.blue,
    borderRadius: 8,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12
  },
  statusCard: {
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#9aa6b1",
    minHeight: 560
  },
  statusBackButton: {
    alignSelf: "flex-start",
    marginBottom: 10
  },
  statusAvatarBox: {
    width: 92,
    height: 92,
    borderWidth: 1,
    borderColor: "#b7b7b7",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center"
  },
  statusName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 4
  },
  statusActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 14
  },
  statusMiniButton: {
    flex: 1,
    minWidth: 0,
    height: 24,
    borderRadius: 5
  },
  statusMiniText: {
    fontSize: 8
  },
  timelineWrap: {
    marginTop: 4
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 58
  },
  timelineLeft: {
    width: 16,
    alignItems: "center"
  },
  timelineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#b8b8b8",
    marginTop: 2
  },
  timelineDotActive: {
    backgroundColor: "#33cb32"
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
    fontSize: 9,
    color: "#8b8b8b",
    fontWeight: "700"
  },
  timelineLabelActive: {
    color: "#37c637"
  },
  timelineLabelCompleted: {
    color: "#808080"
  },
  timelineMeta: {
    fontSize: 7,
    color: "#8a8a8a",
    lineHeight: 9
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
    height: 28,
    borderRadius: 6,
    marginTop: 6
  },
  leaveReviewText: {
    fontSize: 10
  },
  proofTitleButton: {
    alignSelf: "center",
    minWidth: 110,
    height: 26,
    borderRadius: 6,
    marginTop: 10,
    marginBottom: 16
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
    height: 30,
    borderRadius: 6,
    marginTop: 10
  },
  historyEntryCard: {
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#9aa6b1",
    marginBottom: 18
  },
  historyEntryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.blue,
    textAlign: "center",
    marginBottom: 10
  },
  historyEntryInner: {
    borderWidth: 1,
    borderColor: "#c8c8c8",
    padding: 10
  },
  historyEntryTop: {
    flexDirection: "row",
    gap: 10
  },
  providerAvatarLarge: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: "#a9a9a9",
    justifyContent: "center",
    alignItems: "center"
  },
  providerAvatarXLarge: {
    width: 96,
    height: 96,
    borderWidth: 1,
    borderColor: "#a9a9a9",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 10
  },
  historyProviderMeta: {
    flex: 1
  },
  historyProviderName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#242424"
  },
  historyProviderSmall: {
    fontSize: 7,
    color: "#868686",
    lineHeight: 9
  },
  historyComplete: {
    color: "#30c033",
    fontWeight: "700"
  },
  historyEntryButton: {
    height: 30,
    borderRadius: 6,
    alignSelf: "center",
    marginTop: 12,
    minWidth: 120
  },
  historyEntryButtonText: {
    fontSize: 10
  },
  historyProofImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginTop: 12
  },
  ongoingCard: {
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#9aa6b1"
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
    borderColor: "#c8c8c8",
    padding: 12
  },
  ongoingName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#242424",
    textAlign: "center",
    marginBottom: 10
  },
  ongoingStatusButton: {
    height: 30,
    borderRadius: 6,
    alignSelf: "center",
    minWidth: 145
  },
  reviewFormCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#9aa6b1"
  },
  reviewFormTitle: {
    fontSize: 18,
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
    fontSize: 9,
    color: "#4e4e4e",
    marginTop: 10,
    marginBottom: 6
  },
  reviewCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10
  },
  reviewCheckboxText: {
    fontSize: 8,
    color: "#5c5c5c"
  },
  reviewInput: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: "#9f9f9f",
    borderRadius: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 10,
    color: theme.text
  },
  reviewSubmitButton: {
    alignSelf: "center",
    minWidth: 118,
    height: 30,
    borderRadius: 6,
    marginTop: 16
  },
  reviewPostedCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
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
    height: 30,
    borderRadius: 6
  },
  completionModalCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    width: "100%",
    maxWidth: 340,
    alignSelf: "center"
  },
  proofGalleryRow: {
    gap: 10,
    paddingVertical: 4
  },
  proofGalleryImage: {
    width: 130,
    height: 130,
    borderRadius: 10
  },
  completionPreviewImage: {
    width: 110,
    height: 110,
    borderRadius: 10
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
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#b7b7b7"
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
    height: 34,
    borderRadius: 8
  },
  equalActionButtonSecondary: {
    backgroundColor: theme.blueDark
  },
  myReviewCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#9aa6b1"
  },
  workerHero: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#9aa6b1"
  },
  workerHeroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.blueDark,
    marginBottom: 6
  },
  workerHeroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.blue
  },
  workerHeroSub: {
    marginTop: 8,
    fontSize: 12,
    color: "#5a5a5a"
  },
  workerStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  workerStatCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#9aa6b1"
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
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#9aa6b1",
    marginBottom: 14
  },
  workerPanelTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.blue,
    marginBottom: 10
  },
  workerPanelText: {
    fontSize: 12,
    color: "#575757",
    lineHeight: 18,
    marginBottom: 12
  },
  workerActionButton: {
    width: "100%",
    height: 34,
    borderRadius: 8,
    marginTop: 6
  },
  workerSecondaryButton: {
    width: "100%",
    height: 34,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: theme.blueDark
  },
  workerRequestCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#9aa6b1",
    marginBottom: 12
  },
  workerRequestTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  workerRequestName: {
    fontSize: 15,
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
  workerRequestText: {
    fontSize: 11,
    color: "#5b5b5b",
    lineHeight: 16
  },
  workerDetailLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.blueDark,
    marginTop: 10,
    marginBottom: 4
  },
  workerDetailValue: {
    fontSize: 12,
    color: "#3d3d3d",
    lineHeight: 18
  },
  workerHistoryProofImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginTop: 12
  }
});
