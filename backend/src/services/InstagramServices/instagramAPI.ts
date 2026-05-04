import axios from "axios";
import logger from "../../utils/logger";

const normalizeVersion = (version?: string): string => {
  const rawVersion = version || "v25.0";
  return rawVersion.startsWith("v") ? rawVersion : `v${rawVersion}`;
};

const instagramApiVersion = normalizeVersion(
  process.env.INSTAGRAM_GRAPH_API_VERSION || process.env.META_GRAPH_API_VERSION
);
const instagramGraphBaseUrl = `https://graph.instagram.com/${instagramApiVersion}/`;

const getInstagramAppCredentials = () => {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET missing");
  }

  return { appId, appSecret };
};

const apiBase = (token: string) =>
  axios.create({
    baseURL: instagramGraphBaseUrl,
    params: {
      access_token: token
    }
  });

export const isInstagramDirectProvider = (
  provider?: string,
  token?: string
): boolean =>
  provider === "instagram" ||
  provider === "instagram_direct" ||
  Boolean(token?.startsWith("IG"));

export const exchangeInstagramCodeForToken = async (
  code: string,
  redirectUri: string
): Promise<any> => {
  const { appId, appSecret } = getInstagramAppCredentials();
  const form = new URLSearchParams();

  form.set("client_id", appId);
  form.set("client_secret", appSecret);
  form.set("grant_type", "authorization_code");
  form.set("redirect_uri", redirectUri);
  form.set("code", code);

  const { data } = await axios.post(
    "https://api.instagram.com/oauth/access_token",
    form.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );

  return data;
};

export const exchangeForLongLivedInstagramToken = async (
  shortLivedToken: string
): Promise<string> => {
  const { appSecret } = getInstagramAppCredentials();
  const { data } = await axios.get("https://graph.instagram.com/access_token", {
    params: {
      grant_type: "ig_exchange_token",
      client_secret: appSecret,
      access_token: shortLivedToken
    }
  });

  return data.access_token;
};

export const getInstagramMe = async (token: string): Promise<any> => {
  try {
    const { data } = await apiBase(token).get("me", {
      params: {
        fields: "user_id,username,account_type,profile_picture_url,name"
      }
    });

    return data;
  } catch (error) {
    logger.warn("[Instagram Direct] failed to fetch full profile, retrying minimal profile");
    const { data } = await apiBase(token).get("me", {
      params: {
        fields: "user_id,username"
      }
    });

    return data;
  }
};

export const subscribeInstagramDirectApp = async (
  igUserId: string,
  token: string
): Promise<any> => {
  const { data } = await apiBase(token).post(`${igUserId}/subscribed_apps`, null, {
    params: {
      subscribed_fields: "messages,messaging_postbacks"
    }
  });

  return data;
};

export const getInstagramProfile = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await apiBase(token).get(id, {
      params: {
        fields: "id,username,name,profile_picture_url"
      }
    });

    return data;
  } catch (error) {
    return { id };
  }
};

export const sendInstagramText = async (
  igUserId: string,
  recipientId: string | number,
  text: string,
  token: string
): Promise<any> => {
  const { data } = await apiBase(token).post(`${igUserId}/messages`, {
    recipient: {
      id: recipientId
    },
    message: {
      text
    }
  });

  return data;
};

export const sendInstagramAttachmentFromUrl = async (
  igUserId: string,
  recipientId: string | number,
  url: string,
  type: string,
  token: string
): Promise<any> => {
  const { data } = await apiBase(token).post(`${igUserId}/messages`, {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type,
        payload: {
          url
        }
      }
    }
  });

  return data;
};

export const getInstagramDirectConversations = async (
  igUserId: string,
  token: string,
  limit = 25
): Promise<any> => {
  const { data } = await apiBase(token).get(`${igUserId}/conversations`, {
    params: {
      platform: "instagram",
      fields: "id,updated_time,participants",
      limit
    }
  });

  return data;
};

export const getInstagramDirectConversationMessages = async (
  conversationId: string,
  token: string,
  limit = 25
): Promise<any> => {
  const { data } = await apiBase(token).get(`${conversationId}/messages`, {
    params: {
      fields: "id,message,from,to,created_time,attachments",
      limit
    }
  });

  return data;
};
