import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'english' | 'hindi' | 'marathi';

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

const translations: Translations = {
  profile: {
    english: 'Profile',
    hindi: 'प्रोफ़ाइल',
    marathi: 'प्रोफाइल',
  },
  your_ratings: {
    english: 'Your Ratings',
    hindi: 'आपकी रेटिंग',
    marathi: 'तुमची रेटिंग',
  },
  account_settings: {
    english: 'ACCOUNT SETTINGS',
    hindi: 'खाता सेटिंग्स',
    marathi: 'खाते सेटिंग्ज',
  },
  payment_acceptance_mode: {
    english: 'Payment acceptance mode',
    hindi: 'भुगतान स्वीकृति मोड',
    marathi: 'पेमेंट स्वीकृती मोड',
  },
  language: {
    english: 'Language',
    hindi: 'भाषा',
    marathi: 'भाषा',
  },
  help_support: {
    english: 'HELP & SUPPORT',
    hindi: 'सहायता और समर्थन',
    marathi: 'मदत आणि समर्थन',
  },
  give_us_feedback: {
    english: 'Give us a feedback',
    hindi: 'हमें प्रतिक्रिया दें',
    marathi: 'आम्हाला प्रतिक्रिया द्या',
  },
  help_support_item: {
    english: 'Help & support',
    hindi: 'सहायता और समर्थन',
    marathi: 'मदत आणि समर्थन',
  },
  home: {
    english: 'Home',
    hindi: 'होम',
    marathi: 'होम',
  },
  manage: {
    english: 'Manage',
    hindi: 'प्रबंधित करें',
    marathi: 'व्यवस्थापित करा',
  },
  more_tabs: {
    english: 'More',
    hindi: 'और',
    marathi: 'अधिक',
  },
  earnings: {
    english: 'Earnings',
    hindi: 'कमाई',
    marathi: 'कमाई',
  },
  active_jobs: {
    english: 'Active Jobs',
    hindi: 'सक्रिय कार्य',
    marathi: 'सक्रिय नोकऱ्या',
  },
  pending: {
    english: 'Pending',
    hindi: 'लंबित',
    marathi: 'प्रलंबित',
  },
  upcoming: {
    english: 'Upcoming',
    hindi: 'आगामी',
    marathi: 'आगामी',
  },
  total_earnings: {
    english: 'Total Earnings',
    hindi: 'कुल कमाई',
    marathi: 'एकूण कमाई',
  },
  total_jobs: {
    english: 'Total Jobs',
    hindi: 'कुल कार्य',
    marathi: 'एकूण नोकऱ्या',
  },
  view_details: {
    english: 'View Details',
    hindi: 'विवरण देखें',
    marathi: 'तपशील पहा',
  },
  accept: {
    english: 'Accept',
    hindi: 'स्वीकार करें',
    marathi: 'स्वीकारा',
  },
  reject: {
    english: 'Reject',
    hindi: 'अस्वीकार करें',
    marathi: 'नाकारा',
  },
  ready_to_collect: {
    english: 'Ready to collect scrap today?',
    hindi: 'आज कबाड़ इकट्ठा करने के लिए तैयार हैं?',
    marathi: 'आज भंगार गोळा करायला तयार आहात का?',
  },
  currently_offline: {
    english: 'Currently offline',
    hindi: 'अभी ऑफलाइन',
    marathi: 'सध्या ऑफलाइन',
  },
  online: {
    english: 'Online',
    hindi: 'ऑनलाइन',
    marathi: 'ऑनलाइन',
  },
  offline: {
    english: 'Offline',
    hindi: 'ऑफलाइन',
    marathi: 'ऑफलाइन',
  },
  receiving_bookings: {
    english: 'Receiving new bookings',
    hindi: 'नई बुकिंग प्राप्त हो रही है',
    marathi: 'नवीन बुकिंग प्राप्त होत आहेत',
  },
  not_receiving_bookings: {
    english: 'Currently not receiving bookings',
    hindi: 'वर्तमान में बुकिंग प्राप्त नहीं हो रही है',
    marathi: 'सध्या बुकिंग प्राप्त होत नाहीत',
  },
  go_offline: {
    english: 'Go Offline',
    hindi: 'ऑफलाइन जाएं',
    marathi: 'ऑफलाइन जा',
  },
  go_online: {
    english: 'Go Online',
    hindi: 'ऑनलाइन जाएं',
    marathi: 'ऑनलाइन जा',
  },
  new_booking_requests: {
    english: 'New Booking Requests',
    hindi: 'नए बुकिंग अनुरोध',
    marathi: 'नवीन बुकिंग विनंत्या',
  },
  requests_available: {
    english: 'requests available',
    hindi: 'अनुरोध उपलब्ध',
    marathi: 'विनंत्या उपलब्ध',
  },
  just_now: {
    english: 'Just now',
    hindi: 'अभी',
    marathi: 'आत्ताच',
  },
  ready_for_pickups: {
    english: 'Ready for new pickups!',
    hindi: 'नए पिकअप के लिए तैयार!',
    marathi: 'नवीन पिकअपसाठी तयार!',
  },
  notify_requests: {
    english: "We'll notify you as soon as requests come in",
    hindi: 'जैसे ही अनुरोध आएंगे हम आपको सूचित करेंगे',
    marathi: 'विनंत्या येताच आम्ही तुम्हाला सूचित करू',
  },
  check_updates: {
    english: 'Check for updates',
    hindi: 'अपडेट के लिए जाँच करें',
    marathi: 'अपडेट तपासा',
  },
  todays_overview: {
    english: "Today's Overview",
    hindi: 'आज का अवलोकन',
    marathi: 'आजचे विहंगावलोकन',
  },
  handled: {
    english: 'Handled',
    hindi: 'संभाला',
    marathi: 'हाताळले',
  },
  cancelled: {
    english: 'Cancelled',
    hindi: 'रद्द किया गया',
    marathi: 'रद्द केले',
  },
  quantity_purchased: {
    english: 'Quantity Purchased',
    hindi: 'खरीदी गई मात्रा',
    marathi: 'खरेदी केलेली मात्रा',
  },
  purchase_amount: {
    english: 'Purchase Amount',
    hindi: 'खरीद राशि',
    marathi: 'खरेदी रक्कम',
  },
  wallet_balance_low: {
    english: 'Wallet balance low',
    hindi: 'वॉलेट बैलेंस कम है',
    marathi: 'वॉलेट शिल्लक कमी आहे',
  },
  add_funds_warning: {
    english: 'Please add funds to your wallet to avoid suspension of your account.',
    hindi: 'कृपया अपने खाते के निलंबन से बचने के लिए अपने वॉलेट में धनराशि जोड़ें।',
    marathi: 'कृपया तुमच्या खात्याचे निलंबन टाळण्यासाठी तुमच्या वॉलेटमध्ये निधी जोडा.',
  },
  good_morning: {
    english: 'Good Morning',
    hindi: 'शुभ प्रभात',
    marathi: 'शुभ प्रभात',
  },
  good_afternoon: {
    english: 'Good Afternoon',
    hindi: 'शुभ दोपहर',
    marathi: 'शुभ दुपार',
  },
  good_evening: {
    english: 'Good Evening',
    hindi: 'शुभ संध्या',
    marathi: 'शुभ संध्या',
  },
  duty_sessions: {
    english: 'Duty Sessions',
    hindi: 'ड्यूटी सत्र',
    marathi: 'ड्युटी सत्रे',
  },
  no_duty_session: {
    english: 'No duty session available',
    hindi: 'कोई ड्यूटी सत्र उपलब्ध नहीं है',
    marathi: 'कोणतेही ड्युटी सत्र उपलब्ध नाही',
  },
  no_session_to_show: {
    english: 'No duty session to show',
    hindi: 'दिखाने के लिए कोई ड्यूटी सत्र नहीं है',
    marathi: 'दाखवण्यासाठी कोणतेही ड्युटी सत्र नाही',
  },
  active_sessions: {
    english: 'Active Sessions',
    hindi: 'सक्रिय सत्र',
    marathi: 'सक्रिय सत्रे',
  },
  past_duty_sessions: {
    english: 'Past duty sessions',
    hindi: 'पिछले ड्यूटी सत्र',
    marathi: 'मागील ड्युटी सत्रे',
  },
  select_date: {
    english: 'Select date',
    hindi: 'तिथि चुनें',
    marathi: 'तारीख निवडा',
  },
  done: {
    english: 'Done',
    hindi: 'हो गया',
    marathi: 'झाले',
  },
  today: {
    english: 'Today',
    hindi: 'आज',
    marathi: 'आज',
  },
  yesterday: {
    english: 'Yesterday',
    hindi: 'कल',
    marathi: 'काल',
  },
  last_7_days: {
    english: 'Last 7 Days',
    hindi: 'पिछले 7 दिन',
    marathi: 'मागील ७ दिवस',
  },
  this_month: {
    english: 'This month',
    hindi: 'इस महीने',
    marathi: 'या महिन्यात',
  },
  last_month: {
    english: 'Last Month',
    hindi: 'पिछले महीने',
    marathi: 'मागील महिना',
  },
  past_6_months: {
    english: 'Past 6 months',
    hindi: 'पिछले 6 महीने',
    marathi: 'मागील ६ महिने',
  },
  this_year: {
    english: 'This year',
    hindi: 'इस साल',
    marathi: 'या वर्षी',
  },
  lifetime: {
    english: 'Lifetime',
    hindi: 'लाइफटाइम',
    marathi: 'आयुष्यभर',
  },
  from: {
    english: 'From',
    hindi: 'से',
    marathi: 'पासून',
  },
  to: {
    english: 'To',
    hindi: 'तक',
    marathi: 'पर्यंत',
  },
  more_options: {
    english: 'More Options',
    hindi: 'अधिक विकल्प',
    marathi: 'अधिक पर्याय',
  },
  services: {
    english: 'Services',
    hindi: 'सेवाएं',
    marathi: 'सेवा',
  },
  account: {
    english: 'Account',
    hindi: 'खाता',
    marathi: 'खाते',
  },
  future_requests: {
    english: 'Future Requests',
    hindi: 'भविष्य के अनुरोध',
    marathi: 'भविष्यातील विनंत्या',
  },
  scheduled_jobs: {
    english: 'Scheduled jobs',
    hindi: 'अनुसूचित कार्य',
    marathi: 'अनुसूचित कामे',
  },
  materials: {
    english: 'Materials',
    hindi: 'सामग्री',
    marathi: 'साहित्य',
  },
  scrap_rates: {
    english: 'Scrap rates',
    hindi: 'कबाड़ की दरें',
    marathi: 'भंगार दर',
  },
  contacts: {
    english: 'Contacts',
    hindi: 'संपर्क',
    marathi: 'संपर्क',
  },
  customer_contacts: {
    english: 'Customer contacts',
    hindi: 'ग्राहक संपर्क',
    marathi: 'ग्राहक संपर्क',
  },
  payment_settings_item: {
    english: 'Payment Settings',
    hindi: 'भुगतान सेटिंग्स',
    marathi: 'पेमेंट सेटिंग्ज',
  },
  bank_payment: {
    english: 'Bank & payment',
    hindi: 'बैंक और भुगतान',
    marathi: 'बँक आणि पेमेंट',
  },
  vehicle_details: {
    english: 'Vehicle Details',
    hindi: 'वाहन विवरण',
    marathi: 'वाहन तपशील',
  },
  manage_vehicle: {
    english: 'Manage vehicle',
    hindi: 'वाहन प्रबंधित करें',
    marathi: 'वाहन व्यवस्थापित करा',
  },
  app_settings: {
    english: 'App Settings',
    hindi: 'ऐप सेटिंग्स',
    marathi: 'ॲप सेटिंग्ज',
  },
  preferences: {
    english: 'Preferences',
    hindi: 'प्राथमिकताएं',
    marathi: 'पसंती',
  },
  reports: {
    english: 'Reports',
    hindi: 'रिपोर्ट',
    marathi: 'अहवाल',
  },
  earnings_stats: {
    english: 'Earnings & stats',
    hindi: 'कमाई और आँकड़े',
    marathi: 'कमाई आणि आकडेवारी',
  },
  get_assistance: {
    english: 'Get assistance',
    hindi: 'सहायता प्राप्त करें',
    marathi: 'मदत मिळवा',
  },
  profile_settings: {
    english: 'Profile Settings',
    hindi: 'प्रोफ़ाइल सेटिंग्स',
    marathi: 'प्रोफाइल सेटिंग्ज',
  },
  edit_your_profile: {
    english: 'Edit your profile',
    hindi: 'अपनी प्रोफ़ाइल संपादित करें',
    marathi: 'तुमचे प्रोफाइल संपादित करा',
  },
  notifications: {
    english: 'Notifications',
    hindi: 'सूचनाएं',
    marathi: 'सूचना',
  },
  manage_alerts: {
    english: 'Manage alerts',
    hindi: 'अलर्ट प्रबंधित करें',
    marathi: 'अलर्ट व्यवस्थापित करा',
  },
  privacy: {
    english: 'Privacy',
    hindi: 'गोपनीयता',
    marathi: 'गोपनीयता',
  },
  privacy_settings: {
    english: 'Privacy settings',
    hindi: 'गोपनीयता सेटिंग्स',
    marathi: 'गोपनीयता सेटिंग्ज',
  },
  sign_out: {
    english: 'Sign Out',
    hindi: 'साइन आउट',
    marathi: 'साइन आउट',
  },
  logout_from_app: {
    english: 'Logout from app',
    hindi: 'ऐप से लॉगआउट करें',
    marathi: 'ॲपमधून लॉग-आउट करा',
  },
  scrapiz_vendor_app: {
    english: 'Scrapiz Vendor App',
    hindi: 'स्क्रेपिज वेंडर ऐप',
    marathi: 'स्क्रेपिज वेंडर ॲप',
  },
  version: {
    english: 'Version',
    hindi: 'संस्करण',
    marathi: 'आवृत्ती',
  },
  booking_request: {
    english: 'Booking Request',
    hindi: 'बुकिंग अनुरोध',
    marathi: 'बुकिंग विनंती',
  },
  new_request: {
    english: 'New Request',
    hindi: 'नया अनुरोध',
    marathi: 'नवीन विनंती',
  },
  pickup_location: {
    english: 'Pickup Location',
    hindi: 'पिकअप स्थान',
    marathi: 'पिकअप ठिकाण',
  },
  navigate: {
    english: 'Navigate',
    hindi: 'नेविगेट',
    marathi: 'नेविगेट',
  },
  share: {
    english: 'Share',
    hindi: 'साझा करें',
    marathi: 'शेअर करा',
  },
  customer_privacy_protected: {
    english: 'Customer Privacy Protected',
    hindi: 'ग्राहक गोपनीयता सुरक्षित',
    marathi: 'ग्राहकाची गोपनीयता सुरक्षित',
  },
  privacy_notice_text: {
    english: 'Contact details will be revealed after you accept this booking request. This protects customer privacy and ensures committed service.',
    hindi: 'इस बुकिंग अनुरोध को स्वीकार करने के बाद संपर्क विवरण सामने आएंगे। यह ग्राहक की गोपनीयता की रक्षा करता है और प्रतिबद्ध सेवा सुनिश्चित करता है।',
    marathi: 'तुम्ही ही बुकिंग विनंती स्वीकारल्यानंतर संपर्क तपशील उघड होतील. हे ग्राहकाच्या गोपनीयतेचे रक्षण करते आणि वचनबद्ध सेवा सुनिश्चित करते.',
  },
  customer_details: {
    english: 'Customer Details',
    hindi: 'ग्राहक विवरण',
    marathi: 'ग्राहकाचा तपशील',
  },
  phone_number: {
    english: 'Phone Number',
    hindi: 'फोन नंबर',
    marathi: 'फोन नंबर',
  },
  tap_to_call: {
    english: 'Tap to call customer',
    hindi: 'ग्राहक को कॉल करने के लिए टैप करें',
    marathi: 'ग्राहकाला कॉल करण्यासाठी टॅप करा',
  },
  accept_to_reveal: {
    english: 'Accept booking to reveal number',
    hindi: 'नंबर देखने के लिए बुकिंग स्वीकार करें',
    marathi: 'नंबर पाहण्यासाठी बुकिंग स्वीकारा',
  },
  call_now: {
    english: 'Call Now',
    hindi: 'अभी कॉल करें',
    marathi: 'आता कॉल करा',
  },
  locked: {
    english: 'Locked',
    hindi: 'लॉक',
    marathi: 'लॉक',
  },
  message: {
    english: 'Message',
    hindi: 'संवाद',
    marathi: 'संदेश',
  },
  scrap_material: {
    english: 'Scrap Material',
    hindi: 'कबाड़ सामग्री',
    marathi: 'भंगार साहित्य',
  },
  estimated_weight: {
    english: 'Est. Weight',
    hindi: 'अनुमानित वजन',
    marathi: 'अंदाजे वजन',
  },
  pickup_date: {
    english: 'Pickup Date',
    hindi: 'पिकअप तिथि',
    marathi: 'पिकअप तारीख',
  },
  payment_method: {
    english: 'Payment Method',
    hindi: 'भुगतान विधि',
    marathi: 'पेमेंट पद्धत',
  },
  estimated_value: {
    english: 'Estimated Value',
    hindi: 'अनुमानित मूल्य',
    marathi: 'अंदाजे मूल्य',
  },
  decline_booking: {
    english: 'Decline Booking',
    hindi: 'बुकिंग अस्वीकार करें',
    marathi: 'बुकिंग नाकारा',
  },
  accept_booking: {
    english: 'Accept Booking',
    hindi: 'बुकिंग स्वीकार करें',
    marathi: 'बुकिंग स्वीकारा',
  },
  start_navigation: {
    english: 'Start Navigation',
    hindi: 'नेविगेशन शुरू करें',
    marathi: 'नेविगेशन सुरू करा',
  },
  booking_accepted_msg: {
    english: 'Booking Accepted!',
    hindi: 'बुकिंग स्वीकार कर ली गई!',
    marathi: 'बुकिंग स्वीकारली!',
  },
  today_caps: {
    english: 'TODAY',
    hindi: 'आज',
    marathi: 'आज',
  },
  tomorrow_caps: {
    english: 'TOMORROW',
    hindi: 'कल',
    marathi: 'उद्या',
  },
  urgent: {
    english: 'Urgent',
    hindi: 'तत्काल',
    marathi: 'तातडीचे',
  },
  mins_away: {
    english: 'mins away',
    hindi: 'मिनट दूर',
    marathi: 'मिनिटे लांब',
  },
  contact_details: {
    english: 'Contact information',
    hindi: 'संपर्क जानकारी',
    marathi: 'संपर्क माहिती',
  },
  limited_info: {
    english: 'Limited information available',
    hindi: 'सीमित जानकारी उपलब्ध',
    marathi: 'मर्यादित माहिती उपलब्ध',
  },
  priority_high: {
    english: 'High Priority',
    hindi: 'उच्च प्राथमिकता',
    marathi: 'उच्च प्राथमिकता',
  },
  accepted_info_available: {
    english: 'Contact information is now available. You can call or message the customer.',
    hindi: 'संपर्क जानकारी अब उपलब्ध है। आप ग्राहक को कॉल या संदेश भेज सकते हैं।',
    marathi: 'संपर्क माहिती आता उपलब्ध आहे. तुम्ही ग्राहकाला कॉल किंवा मेसेज करू शकता.',
  },
  review_details_action: {
    english: 'Review the details above and choose your action',
    hindi: 'ऊपर दिए गए विवरणों की समीक्षा करें और अपनी कार्रवाई चुनें',
    marathi: 'वरील तपशीलांचे पुनरावलोकन करा आणि तुमची कृती निवडा',
  },
  more: {
    english: 'MORE',
    hindi: 'अधिक',
    marathi: 'अधिक',
  },
  privacy_policy: {
    english: 'Privacy policy',
    hindi: 'गोपनीयता नीति',
    marathi: 'गोपनीयता धोरण',
  },
  content_policy: {
    english: 'Content policy',
    hindi: 'सामग्री नीति',
    marathi: 'सामग्री धोरण',
  },
  terms_conditions: {
    english: 'Terms & Conditions',
    hindi: 'नियम और शर्तें',
    marathi: 'अटी आणि शर्ती',
  },
  logout: {
    english: 'Logout',
    hindi: 'लॉगआउट',
    marathi: 'लॉगआउट',
  },
  logout_confirm: {
    english: 'Are you sure you want to logout?',
    hindi: 'क्या आप वाकई लॉग आउट करना चाहते हैं?',
    marathi: 'तुम्हाला खात्री आहे की तुम्ही लॉग आउट करू इच्छिता?',
  },
  cancel: {
    english: 'Cancel',
    hindi: 'रद्द करें',
    marathi: 'रद्द करा',
  },
  select_language: {
    english: 'Select Language',
    hindi: 'भाषा चुनें',
    marathi: 'भाषा निवडा',
  },
  app_version: {
    english: 'App Version',
    hindi: 'ऐप संस्करण',
    marathi: 'अ‍ॅप आवृत्ती',
  },
  no_bills_created: {
    english: 'No bills created',
    hindi: 'कोई बिल नहीं बनाया गया',
    marathi: 'कोणतेही बिल तयार केलेले नाही',
  },
  no_bills_yet: {
    english: 'No bills have been created yet.',
    hindi: 'अभी तक कोई बिल नहीं बनाया गया है।',
    marathi: 'अद्याप कोणतेही बिल तयार केलेले नाही.',
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('english');

  useEffect(() => {
    const loadLanguage = async () => {
      const savedLang = await AsyncStorage.getItem('app_language');
      if (savedLang && (savedLang === 'english' || savedLang === 'hindi' || savedLang === 'marathi')) {
        setLanguageState(savedLang as Language);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('app_language', lang);
  };

  const t = (key: string) => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
