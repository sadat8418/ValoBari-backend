import axios from "axios";
import BkashToken from "./bkashToken.js";

const authHeaders = async (config) => {
  const token = await grantToken(config);
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "X-APP-Key": config.app_key,
  };
};

const grantToken = async (config) => {
  const tokenDoc = await BkashToken.findOne({});

  if (!tokenDoc || tokenDoc.updatedAt < new Date(Date.now() - 3600000)) {
    return setToken(config);
  }
  return tokenDoc.auth_token;
};

const setToken = async (config) => {
  const res = await axios.post(
    `${config.base_url}/tokenized/checkout/token/grant`,
    {
      app_key: config.app_key,
      app_secret: config.app_secret,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        username: config.username,
        password: config.password,
      },
    }
  );

  await BkashToken.findOneAndUpdate(
    {},
    { auth_token: res.data.id_token },
    { upsert: true }
  );

  return res.data.id_token;
};

export const createPayment = async (config, details) => {
  const res = await axios.post(
    `${config.base_url}/tokenized/checkout/create`,
    {
      mode: "0011",
      currency: "BDT",
      intent: "sale",
      amount: details.amount.toString(),
      callbackURL: details.callbackURL,
      payerReference: details.phone,
      merchantInvoiceNumber: details.orderID,
    },
    { headers: await authHeaders(config) }
  );

  return res.data;
};

export const executePayment = async (config, paymentID) => {
  const res = await axios.post(
    `${config.base_url}/tokenized/checkout/execute`,
    { paymentID },
    { headers: await authHeaders(config) }
  );
  return res.data;
};
