import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { sendText } from "./graphAPI";
import formatBody from "../../helpers/Mustache";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const sendFacebookMessage = async ({ body, ticket, quotedMsg }: Request): Promise<any> => {
  const { number } = ticket.contact;
  try {

    const send = await sendText(
      number,
      formatBody(body, ticket),
      ticket.whatsapp.facebookUserToken
    );

    await ticket.update({ lastMessage: body });

    return send;

  } catch (err) {
    const fbError = err?.response?.data?.error;
    console.error("[sendFacebookMessage]", {
      ticketId: ticket.id,
      channel: ticket.channel,
      recipient: number,
      fbError
    });
    const detail = fbError?.message || err?.message || "unknown";
    throw new AppError(`ERR_SENDING_FACEBOOK_MSG: ${detail}`);
  }
};

export default sendFacebookMessage;
