import { Request, Response } from "express";
import crypto from "crypto";
import { Op } from "sequelize";
import Whatsapp from "../models/Whatsapp";
import { handleMessage } from "../services/FacebookServices/facebookMessageListener";
import logger from "../utils/logger";

const isWebhookSignatureValid = (req: Request): boolean => {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const signature = req.header("x-hub-signature-256");
  const requireSignature =
    process.env.META_REQUIRE_WEBHOOK_SIGNATURE === "true" ||
    process.env.FACEBOOK_VALIDATE_WEBHOOK_SIGNATURE === "true";

  if (!appSecret || !signature) {
    return !requireSignature;
  }

  const rawBody = (req as any).rawBody;
  if (!rawBody) return false;

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")}`;

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "whaticket";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
  }

  return res.status(403).json({
    message: "Forbidden"
  });
};

export const webHook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    if (!isWebhookSignatureValid(req)) {
      return res.status(403).json({
        message: "Invalid webhook signature"
      });
    }

    const { body } = req;
    logger.info(`[Meta Webhook] object=${body?.object} entries=${body?.entry?.length || 0}`);

    if (body.object === "page" || body.object === "instagram") {
      const channel = body.object === "page" ? "facebook" : "instagram";

      for (const entry of body.entry || []) {
        const messagingItems = [
          ...(entry.messaging || []),
          ...((entry.changes || []).map((change: any) => change?.value || change).filter(Boolean))
        ];
        const lookupIds = [
          entry.id,
          ...messagingItems.flatMap((item: any) => [
            item?.recipient?.id,
            item?.value?.recipient?.id
          ])
        ].filter(Boolean);

        const getTokenPage = await Whatsapp.findOne({
          where: {
            facebookPageUserId: {
              [Op.in]: lookupIds.length ? lookupIds : [entry.id]
            },
            channel
          }
        });

        if (!getTokenPage) {
          logger.warn(
            `[Meta Webhook] Nenhuma conexão ${channel} encontrada para ids=${lookupIds.join(",") || entry.id}. Verifique se a conexão foi criada com o ID correto (Instagram Business Account ID para canal instagram, Facebook Page ID para canal facebook).`
          );
          continue;
        }

        logger.info(
          `[Meta Webhook] ${channel} whatsappId=${getTokenPage.id} companyId=${getTokenPage.companyId} eventos=${messagingItems.length}`
        );

        messagingItems.forEach((data: any) => {
          handleMessage(getTokenPage, data, channel, getTokenPage.companyId);
        });
      }

      return res.status(200).json({
        message: "EVENT_RECEIVED"
      });
    }

    return res.status(404).json({
      message: body
    });
  } catch (error) {
    return res.status(500).json({
      message: error
    });
  }
};
