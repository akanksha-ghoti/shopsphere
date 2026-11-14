# Checkout summary pricing

`POST /api/checkout/summary` calculates all money values from the current product and cart records. Client-provided prices, tax, shipping, and totals are not accepted.

The default server pricing settings are:

| Environment variable                   | Default | Meaning                                             |
| -------------------------------------- | ------: | --------------------------------------------------- |
| `CHECKOUT_SHIPPING_FEE_INR`            |    `99` | Flat shipping fee below the free-shipping threshold |
| `CHECKOUT_FREE_SHIPPING_THRESHOLD_INR` |  `1000` | Subtotal at or above which shipping is free         |
| `CHECKOUT_TAX_RATE`                    |  `0.18` | Tax rate applied to the item subtotal (18%)         |

Set these variables in the server's environment to configure the rule; do not commit credentials or environment files. Shipping is waived when the item subtotal reaches the threshold. Tax is calculated separately on the item subtotal, and all monetary line values and totals are rounded to two decimal places. Currency is INR.
