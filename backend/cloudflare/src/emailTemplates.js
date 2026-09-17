const APP_NAME = "Juwon Electric";
const LINE_SHADOW = "http://nimus.de/share/tpl-card/lineshadow.png";
const BOTTOM_BORDER = "http://nimus.de/share/tpl-card/bottom.png";

export const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const nl2br = (value = "") => escapeHtml(value).replace(/\n/g, "<br />");

const textLine = (label, value, options = {}) => {
  if (value === undefined || value === null || value === "") return "";

  return `
    <div style="padding-top:0;margin-top:0;font-family:Montserrat, Helvetica, Arial, sans-serif;font-size:16px;font-weight:300;line-height:24px;text-align:left;color:#000000;">
      <p style="display:block;margin:13px 0;">
        ${escapeHtml(label)}: ${
          options.accent
            ? `<span style="color:#DB464C;">${escapeHtml(value)}</span>`
            : escapeHtml(value)
        }
      </p>
    </div>
  `;
};

const contentRow = (content, padding = "20px 40px 0 40px") => `
  <tr>
    <td align="left" style="font-size:0px;padding:${padding};word-break:break-word;">
      <div style="font-family:Montserrat, Helvetica, Arial, sans-serif;font-size:16px;font-weight:300;line-height:24px;text-align:left;color:#000000;">
        ${content}
      </div>
    </td>
  </tr>
`;

const shell = ({ pretitle, children }) => `
  <!doctype html>
  <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <title>${escapeHtml(pretitle)}</title>
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style type="text/css">
        body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
        table, td { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
        img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
        p { display:block; margin:13px 0; }
      </style>
    </head>
    <body style="word-spacing:normal;background-color:#F2F2F2;">
      <div style="background-color:#F2F2F2;">
        <div style="margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
            <tbody>
              <tr>
                <td style="direction:ltr;font-size:0px;padding:10px 0 20px 0;text-align:center;">&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;">
            <tbody>
              <tr>
                <td style="direction:ltr;font-size:0px;padding:20px 20px 0 20px;text-align:center;">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                    <tbody>
                      <tr>
                        <td align="center" style="font-size:0px;padding:30px 40px 10px 40px;word-break:break-word;">
                          <div style="font-family:Montserrat, Helvetica, Arial, sans-serif;font-size:32px;font-weight:300;line-height:40px;text-align:center;color:purple;">${APP_NAME}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;">
            <tbody>
              <tr>
                <td style="direction:ltr;font-size:0px;padding:10px 20px;text-align:center;">
                  <p style="border-top:solid 3px #9B9B9B;font-size:1px;margin:0px auto;width:30px;">&nbsp;</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;">
            <tbody>
              <tr>
                <td style="direction:ltr;font-size:0px;padding:0 20px 20px 20px;text-align:center;">
                  <div style="font-family:Montserrat, Helvetica, Arial, sans-serif;font-size:16px;font-weight:500;line-height:24px;text-align:center;color:#000000;">${escapeHtml(pretitle)}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="background:#eee;background-color:#eee;margin:0px auto;max-width:600px;color:black;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:black;background:#eee;background-color:#eee;width:100%;">
            <tbody>
              <tr>
                <td align="center" style="font-size:0px;padding:0px;word-break:break-word;">
                  <img alt="" height="auto" src="${LINE_SHADOW}" style="border:none;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="600" />
                </td>
              </tr>
              ${children}
            </tbody>
          </table>
        </div>

        <div style="background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;">
            <tbody>
              <tr>
                <td style="direction:ltr;font-size:0px;padding:50px 0 0 0;text-align:center;">
                  <img alt="bottom border" height="auto" src="${BOTTOM_BORDER}" style="border:none;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="600" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
            <tbody>
              <tr>
                <td align="center" style="font-size:0px;padding:10px 25px 20px 25px;word-break:break-word;">
                  <div style="font-family:Montserrat, Helvetica, Arial, sans-serif;font-size:11px;font-weight:400;line-height:24px;text-align:center;color:#9B9B9B;">
                    <a href="#" style="color:#9B9B9B;text-decoration:none;">&copy; copyright ${APP_NAME}</a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body>
  </html>
`;

export const contactNotificationTemplate = ({
  name,
  emailAddress,
  phoneNumber,
  message,
}) =>
  shell({
    pretitle: `${name || "Someone"} sent you a message`,
    children: [
      contentRow(nl2br(message), "20px 40px 0 40px"),
      contentRow(
        `${textLine("Email", emailAddress)}${textLine("Phone Number", phoneNumber)}`,
        "5px 40px 0 40px"
      ),
    ].join(""),
  });

export const subscriberNotificationTemplate = ({ emailAddress }) =>
  shell({
    pretitle: "You have a new subscriber",
    children: [
      contentRow(
        '<div style="font-weight:500;">Hi there,</div>',
        "10px 0 0 40px"
      ),
      contentRow(
        "Someone just subscribed to your newsletter. Remember to include them in it when you have a new product.",
        "20px 40px 0 40px"
      ),
      contentRow(textLine("Email", emailAddress), "5px 40px 10px 40px"),
    ].join(""),
  });

export const orderNotificationTemplate = ({
  phoneNumber,
  emailAddress,
  name,
  deliveryAddress,
  total,
  order = [],
}) => {
  const naira = (amount) => `₦${new Intl.NumberFormat("en-US").format(Number(amount) || 0)}`;
  // Product lines (COMMERCE_V3 §3.3) read "2 × Name (SKU)"; package lines keep the classic text.
  const lineDetails = (item) =>
    item?.type === "product"
      ? `
            <p style="display:block;margin:13px 0;">Product: ${escapeHtml(item.quantity)} × ${escapeHtml(item.name)} (${escapeHtml(item.sku)})</p>
            <p style="display:block;margin:13px 0;">Price: <span style="color:#DB464C;">${escapeHtml(naira(item.unitPrice))} x ${escapeHtml(item.quantity)} = ${escapeHtml(naira(item.lineTotal))}</span></p>
          `
      : `
            <p style="display:block;margin:13px 0;">Package: ${escapeHtml(item.package)}</p>
            <p style="display:block;margin:13px 0;">Type: ${escapeHtml(item.typeLabel || item.type)} battery</p>
            <p style="display:block;margin:13px 0;">Price: <span style="color:#DB464C;">${escapeHtml(item.price)} x ${escapeHtml(item.quantity)}</span></p>
          `;
  const itemRows = order
    .map((item) => contentRow(lineDetails(item), "5px 40px 0 40px"))
    .join("");

  return shell({
    pretitle: "You have an order",
    children: [
      contentRow('<div style="font-weight:500;">Hi there,</div>', "10px 0 0 40px"),
      contentRow(
        `Congrats! you have just received an order from ${escapeHtml(name)} and below are the details:`,
        "20px 40px 0 40px"
      ),
      itemRows,
      contentRow(
        [
          textLine("Total Amount", total, { accent: true }),
          textLine("Delivery Address", deliveryAddress, { accent: true }),
          textLine("Phone Number", phoneNumber),
          textLine("Email Address", emailAddress),
        ].join(""),
        "5px 40px 0 40px"
      ),
    ].join(""),
  });
};

export const contactReplyTemplate = ({ name, originalMessage, reply }) =>
  shell({
    pretitle: `A reply from ${APP_NAME}`,
    children: [
      contentRow(
        `<div style="font-weight:500;">Hello ${escapeHtml(name || "there")},</div>`,
        "10px 0 0 40px"
      ),
      contentRow(nl2br(reply), "20px 40px 0 40px"),
      originalMessage
        ? contentRow(
            `
              <div style="background:#fff1f1;border:1px solid #f4b7ba;border-left:5px solid #DB464C;border-radius:7px;padding:16px;">
                <p style="display:block;margin:0 0 8px;color:#811418;font-size:12px;font-weight:700;text-transform:uppercase;">Your original message</p>
                <p style="display:block;margin:0;color:#202124;line-height:24px;">${nl2br(originalMessage)}</p>
              </div>
            `,
            "20px 40px 0 40px"
          )
        : "",
      contentRow(`Regards,<br />${APP_NAME}`, "20px 40px 10px 40px"),
    ].join(""),
  });
