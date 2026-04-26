type GtagConsentParams = {
  ad_storage?: "granted" | "denied";
  ad_user_data?: "granted" | "denied";
  ad_personalization?: "granted" | "denied";
  analytics_storage?: "granted" | "denied";
  functionality_storage?: "granted" | "denied";
  personalization_storage?: "granted" | "denied";
  security_storage?: "granted" | "denied";
  wait_for_update?: number;
};

type GtagConfigParams = {
  page_path?: string;
  page_title?: string;
  page_location?: string;
  send_page_view?: boolean;
  anonymize_ip?: boolean;
  transport_type?: "beacon" | "image" | "xhr";
  [key: string]: string | number | boolean | undefined;
};

type GtagEventParams = {
  [key: string]: string | number | boolean | undefined;
};

type GtagFunction = {
  (command: "config", targetId: string, config?: GtagConfigParams): void;
  (command: "event", name: string, params?: GtagEventParams): void;
  (command: "consent", sub: "default" | "update", params: GtagConsentParams): void;
  (command: "js", d: Date): void;
  (command: "set", name: string, value: string): void;
};

export {};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: GtagFunction;
  }
}
