/**
 * Luxury HTML Email Templates for Murari's Glam & Glow
 * Note: Per business specifications, NO tracking links are included in emails.
 */

const baseEmailLayout = ({ title, preheader, content }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FAF8F5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1A1A1A;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    img {
      border: 0;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5;">
  <div style="display: none; font-size: 1px; color: #FAF8F5; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader || title}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF8F5; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E8E3DE; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          
          <!-- Header Branding -->
          <tr>
            <td align="center" style="background-color: #1A1A1A; padding: 32px 24px; border-bottom: 2px solid #C8A87C;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; letter-spacing: 3px; text-transform: uppercase; color: #C8A87C; font-weight: normal;">
                MURARI&apos;S GLAM &amp; GLOW
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #E8E3DE; font-family: monospace;">
                HAUTE COUTURE &bull; CONTEMPORARY LUXURY
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF8F5; padding: 24px 32px; border-top: 1px solid #E8E3DE; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #6B6B6B;">
                Need assistance? Our concierge is available at
                <a href="mailto:murariglamandglow@gmail.com" style="color: #C8A87C; text-decoration: none; font-weight: bold;">
                  murariglamandglow@gmail.com
                </a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #9E9E9E; text-transform: uppercase; letter-spacing: 1px;">
                &copy; ${new Date().getFullYear()} Murari&apos;s Glam &amp; Glow. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * 1. OTP Email Template (Signup Verification & Login OTP)
 */
export const otpEmailTemplate = ({ name, otpCode, purpose = 'verification', expiryMinutes = 10 }) => {
  const isLogin = purpose.toLowerCase().includes('login');
  const title = isLogin ? 'Your Login Verification Code' : 'Verify Your Email Address';
  const preheader = `Your 6-digit verification code is ${otpCode}`;

  const content = `
    <h2 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 22px; color: #1A1A1A; font-weight: bold;">
      ${title}
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4A4A4A;">
      Dear ${name ? `<strong>${name}</strong>` : 'Valued Client'},
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4A4A4A;">
      ${isLogin
        ? 'Use the secure one-time passcode below to sign in to your Murari&apos;s Glam &amp; Glow account.'
        : 'Thank you for registering with Murari&apos;s Glam &amp; Glow. Please enter the verification code below to confirm your account and begin exploring our curated collections.'}
    </p>

    <!-- OTP Code Display Card -->
    <div style="background-color: #FAF8F5; border: 1px solid #C8A87C; border-radius: 4px; padding: 24px 16px; text-align: center; margin: 28px 0;">
      <span style="display: block; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #6B6B6B; margin-bottom: 8px; font-mono;">
        ONE-TIME VERIFICATION CODE
      </span>
      <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #1A1A1A; margin: 4px 0;">
        ${otpCode}
      </div>
      <span style="display: block; font-size: 11px; color: #A5432F; margin-top: 8px; font-weight: 500;">
        &bull; Code expires in ${expiryMinutes} minutes
      </span>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #6B6B6B;">
      If you did not request this verification code, please ignore this email or reach out to our security team. For your protection, never share this code with anyone.
    </p>
  `;

  return baseEmailLayout({ title, preheader, content });
};

/**
 * 2. Order Confirmation & Itemized Receipt Template (Customer)
 * Note: NO tracking link is provided, per business requirements.
 */
export const orderConfirmationTemplate = ({ order, customer }) => {
  const title = `Order Confirmed #${order.orderNumber}`;
  const preheader = `Thank you for your order #${order.orderNumber} with Murari's Glam & Glow`;

  const items = order.items || [];
  const shipping = order.shippingAddress || {};
  const formattedDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const itemsTableRows = items.map((item) => {
    const itemPrice = Number(item.price || 0);
    const itemQty = Number(item.quantity || 1);
    const lineTotal = itemPrice * itemQty;
    const colorName = typeof item.selectedColor === 'object' ? item.selectedColor?.name : (item.selectedColor || 'Standard');

    return `
      <tr>
        <td style="padding: 14px 0; border-bottom: 1px solid #E8E3DE;">
          <div style="font-weight: 600; font-size: 13px; color: #1A1A1A;">${item.name || 'Garment Piece'}</div>
          <div style="font-size: 11px; color: #6B6B6B; margin-top: 3px;">
            Size: ${item.selectedSize || 'Standard'} &bull; Color: ${colorName} &bull; Qty: ${itemQty}
          </div>
        </td>
        <td align="right" style="padding: 14px 0; border-bottom: 1px solid #E8E3DE; font-family: monospace; font-size: 13px; font-weight: 600; color: #1A1A1A;">
          &#8377;${lineTotal.toFixed(2)}
        </td>
      </tr>
    `;
  }).join('');

  const content = `
    <div style="border-bottom: 1px solid #E8E3DE; padding-bottom: 20px; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: #E8F5E9; color: #2E7D32; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 10px; border-radius: 2px; margin-bottom: 10px;">
        Payment Verified &bull; Order Confirmed
      </span>
      <h2 style="margin: 0 0 6px 0; font-family: Georgia, serif; font-size: 24px; color: #1A1A1A;">
        Thank You for Your Order
      </h2>
      <p style="margin: 0; font-size: 13px; color: #6B6B6B;">
        Order #${order.orderNumber} &bull; Placed on ${formattedDate}
      </p>
    </div>

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4A4A4A;">
      Dear ${shipping.fullName || customer?.name || 'Customer'},
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4A4A4A;">
      We are delighted to confirm that your order has been received and is currently being prepared by our fulfillment team. Below are your order details and payment summary.
    </p>

    <!-- Ordered Items Table -->
    <h3 style="margin: 24px 0 12px 0; font-family: Georgia, serif; font-size: 16px; color: #1A1A1A;">
      Purchased Pieces
    </h3>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
      ${itemsTableRows}
    </table>

    <!-- Financial Breakdown -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF8F5; border: 1px solid #E8E3DE; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <tr>
        <td style="padding: 4px 0; font-size: 12px; color: #6B6B6B;">Subtotal:</td>
        <td align="right" style="padding: 4px 0; font-family: monospace; font-size: 12px; color: #1A1A1A;">&#8377;${Number(order.subtotal || 0).toFixed(2)}</td>
      </tr>
      ${Number(order.discount || 0) > 0 ? `
      <tr>
        <td style="padding: 4px 0; font-size: 12px; color: #2E7D32;">Promotional Discount:</td>
        <td align="right" style="padding: 4px 0; font-family: monospace; font-size: 12px; color: #2E7D32;">-&#8377;${Number(order.discount).toFixed(2)}</td>
      </tr>` : ''}
      <tr>
        <td style="padding: 4px 0; font-size: 12px; color: #6B6B6B;">Standard Express Shipping:</td>
        <td align="right" style="padding: 4px 0; font-family: monospace; font-size: 12px; color: #1A1A1A;">
          ${Number(order.shippingCost || 0) === 0 ? '<span style="color: #2E7D32; font-weight: bold;">FREE</span>' : `&#8377;${Number(order.shippingCost).toFixed(2)}`}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0 4px 0; border-top: 1px solid #E8E3DE; font-size: 14px; font-weight: bold; color: #1A1A1A;">Total Paid:</td>
        <td align="right" style="padding: 10px 0 4px 0; border-top: 1px solid #E8E3DE; font-family: monospace; font-size: 16px; font-weight: bold; color: #1A1A1A;">
          &#8377;${Number(order.total || 0).toFixed(2)}
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top: 6px; font-size: 10px; color: #6B6B6B; font-family: monospace;">
          Payment Method: 100% Secure Online Payment (UPI / Cards via Razorpay)
        </td>
      </tr>
    </table>

    <!-- Shipping Address & Details -->
    <div style="background-color: #FFFFFF; border: 1px solid #E8E3DE; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <span style="display: block; font-size: 10px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; color: #C8A87C; margin-bottom: 8px;">
        DELIVERY DESTINATION
      </span>
      <div style="font-weight: 600; font-size: 13px; color: #1A1A1A;">${shipping.fullName || 'Valued Client'}</div>
      <div style="font-size: 12px; color: #6B6B6B; line-height: 1.5; margin-top: 3px;">
        ${shipping.street || ''}${shipping.apartment ? `, ${shipping.apartment}` : ''}<br>
        ${shipping.city || ''}, ${shipping.state || ''} ${shipping.postalCode || ''}<br>
        ${shipping.country || 'India'}
        ${shipping.phone ? `<br>Phone: ${shipping.phone}` : ''}
      </div>
    </div>

    <!-- Estimated Dispatch Info (No Link) -->
    <div style="background-color: #FAF8F5; border-left: 3px solid #C8A87C; padding: 12px 16px; margin-top: 24px;">
      <p style="margin: 0; font-size: 12px; color: #4A4A4A; line-height: 1.5;">
        <strong>Fulfillment Notice:</strong> Your package will be processed and dispatched swiftly via express courier within 24–48 hours.
      </p>
    </div>
  `;

  return baseEmailLayout({ title, preheader, content });
};

/**
 * 3. Admin New Order Alert Template (Store Manager)
 */
export const adminOrderAlertTemplate = ({ order, customer }) => {
  const title = `[New Order Alert] #${order.orderNumber} - ₹${Number(order.total || 0).toFixed(2)}`;
  const preheader = `New order #${order.orderNumber} received from ${order.shippingAddress?.fullName || customer?.name || 'Customer'}`;

  const items = order.items || [];
  const shipping = order.shippingAddress || {};

  const itemsSummary = items.map((i) => `
    <li>${i.name} (Qty: ${i.quantity}, Size: ${i.selectedSize || 'Std'}, Price: &#8377;${i.price})</li>
  `).join('');

  const content = `
    <h2 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 20px; color: #1A1A1A;">
      New Customer Order Received
    </h2>
    <div style="background-color: #FAF8F5; border: 1px solid #E8E3DE; border-radius: 4px; padding: 16px; margin-bottom: 20px;">
      <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Total Amount:</strong> &#8377;${Number(order.total || 0).toFixed(2)} (PAID via Razorpay)</p>
      <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Customer Name:</strong> ${shipping.fullName || customer?.name || 'Customer'}</p>
      <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Customer Email:</strong> ${customer?.email || 'N/A'}</p>
      <p style="margin: 0; font-size: 13px;"><strong>Customer Phone:</strong> ${shipping.phone || customer?.phone || 'N/A'}</p>
    </div>

    <h3 style="margin: 16px 0 8px 0; font-size: 14px; font-weight: bold; color: #1A1A1A;">Items Ordered (${items.length}):</h3>
    <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 13px; color: #4A4A4A; line-height: 1.6;">
      ${itemsSummary}
    </ul>

    <h3 style="margin: 16px 0 8px 0; font-size: 14px; font-weight: bold; color: #1A1A1A;">Delivery Address:</h3>
    <p style="margin: 0; font-size: 13px; color: #4A4A4A; line-height: 1.5;">
      ${shipping.street || ''} ${shipping.apartment || ''}<br>
      ${shipping.city || ''}, ${shipping.state || ''} ${shipping.postalCode || ''}<br>
      ${shipping.country || 'India'}
    </p>
  `;

  return baseEmailLayout({ title, preheader, content });
};

/**
 * 4. Order Shipped Notification Template (Customer)
 * Note: NO tracking link is provided, per business requirements.
 */
export const orderShippedTemplate = ({ order, trackingNumber }) => {
  const title = `Your Order #${order.orderNumber} Has Shipped!`;
  const preheader = `Order #${order.orderNumber} is now on its way to you`;
  const shipping = order.shippingAddress || {};
  const activeTracking = trackingNumber || order.trackingNumber || 'SMLX-EXP-DISPATCH';

  const content = `
    <span style="display: inline-block; background-color: #E0F2FE; color: #0369A1; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 10px; border-radius: 2px; margin-bottom: 12px;">
      Order In Transit
    </span>
    <h2 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 22px; color: #1A1A1A;">
      Your Garments Are on Their Way
    </h2>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4A4A4A;">
      Dear ${shipping.fullName || 'Valued Client'},
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4A4A4A;">
      Great news! Your order <strong>#${order.orderNumber}</strong> has been carefully packed, inspected, and handed over to our courier partner for express delivery.
    </p>

    <!-- Shipment Details Card (No Links) -->
    <div style="background-color: #FAF8F5; border: 1px solid #E8E3DE; border-radius: 4px; padding: 20px; margin: 24px 0;">
      <div style="margin-bottom: 12px;">
        <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #6B6B6B; font-weight: bold;">
          TRACKING NUMBER
        </span>
        <span style="display: block; font-family: monospace; font-size: 16px; font-weight: bold; color: #1A1A1A; margin-top: 4px;">
          ${activeTracking}
        </span>
      </div>
      <div>
        <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #6B6B6B; font-weight: bold;">
          ESTIMATED ARRIVAL
        </span>
        <span style="display: block; font-size: 14px; font-weight: 600; color: #1A1A1A; margin-top: 4px;">
          2 &ndash; 4 Business Days (Express Courier)
        </span>
      </div>
    </div>

    <!-- Delivery Address Reminder -->
    <div style="margin-top: 20px;">
      <span style="display: block; font-size: 10px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; color: #C8A87C; margin-bottom: 4px;">
        DELIVERING TO
      </span>
      <p style="margin: 0; font-size: 13px; color: #4A4A4A; line-height: 1.5;">
        ${shipping.street || ''}${shipping.apartment ? `, ${shipping.apartment}` : ''}, ${shipping.city || ''}, ${shipping.state || ''} ${shipping.postalCode || ''}
      </p>
    </div>
  `;

  return baseEmailLayout({ title, preheader, content });
};

/**
 * 5. Order Delivered Notification Template (Customer)
 */
export const orderDeliveredTemplate = ({ order }) => {
  const title = `Delivered: Your Order #${order.orderNumber}`;
  const preheader = `Your order #${order.orderNumber} has been delivered`;
  const shipping = order.shippingAddress || {};

  const content = `
    <span style="display: inline-block; background-color: #E8F5E9; color: #2E7D32; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 10px; border-radius: 2px; margin-bottom: 12px;">
      Delivered Successfully
    </span>
    <h2 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 22px; color: #1A1A1A;">
      Your Package Has Arrived
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4A4A4A;">
      Dear ${shipping.fullName || 'Valued Client'},
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4A4A4A;">
      Our delivery partner confirms that your order <strong>#${order.orderNumber}</strong> was safely delivered to your doorstep. We hope you adore your new garments as much as we enjoyed crafting them.
    </p>

    <div style="background-color: #FAF8F5; border-left: 3px solid #C8A87C; padding: 14px 16px; margin: 24px 0;">
      <h4 style="margin: 0 0 4px 0; font-size: 13px; color: #1A1A1A;">7-Day Easy Return &amp; Exchange</h4>
      <p style="margin: 0; font-size: 12px; color: #6B6B6B; line-height: 1.5;">
        Need a different size or fit? You are covered by our 7-day complimentary return and exchange window. Reach out to our concierge at <a href="mailto:murariglamandglow@gmail.com" style="color: #C8A87C;">murariglamandglow@gmail.com</a>.
      </p>
    </div>
  `;

  return baseEmailLayout({ title, preheader, content });
};

/**
 * 6. Order Cancelled & Refund Notice Template (Customer & Admin)
 */
export const orderCancelledTemplate = ({ order, reason = 'Customer request' }) => {
  const title = `Order Cancelled #${order.orderNumber}`;
  const preheader = `Order #${order.orderNumber} has been cancelled`;
  const shipping = order.shippingAddress || {};

  const content = `
    <span style="display: inline-block; background-color: #FEE2E2; color: #991B1B; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 10px; border-radius: 2px; margin-bottom: 12px;">
      Order Cancelled
    </span>
    <h2 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 22px; color: #1A1A1A;">
      Order Cancellation Confirmation
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4A4A4A;">
      Dear ${shipping.fullName || 'Valued Client'},
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4A4A4A;">
      Your order <strong>#${order.orderNumber}</strong> has been cancelled.
    </p>

    <div style="background-color: #FAF8F5; border: 1px solid #E8E3DE; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #1A1A1A;">
        <strong>Cancellation Reason:</strong> ${reason}
      </p>
      <p style="margin: 0; font-size: 13px; color: #1A1A1A;">
        <strong>Refund Status:</strong> If you paid online, a full refund of <strong>&#8377;${Number(order.total || 0).toFixed(2)}</strong> has been initiated and will be credited to your original payment source within 3 to 5 business days.
      </p>
    </div>

    <p style="margin: 20px 0 0 0; font-size: 12px; color: #6B6B6B; line-height: 1.5;">
      If you have questions regarding your refund or cancellation, please reach out to us at <a href="mailto:murariglamandglow@gmail.com" style="color: #C8A87C;">murariglamandglow@gmail.com</a>.
    </p>
  `;

  return baseEmailLayout({ title, preheader, content });
};
