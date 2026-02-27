/**
 * Developer Tools - Interactive Tool Panels
 *
 * Provides expandable, interactive tool panels for blockchain operations
 */

import * as core from "@keepkey/hdwallet-core";
import $ from "jquery";

export interface ToolOperation {
  id: string;
  label: string;
  description: string;
  category?: string;
  inputs?: {
    id: string;
    label: string;
    type: "text" | "number" | "select" | "textarea";
    placeholder?: string;
    defaultValue?: string;
    options?: { value: string; label: string }[];
  }[];
  action: () => Promise<string>;
}

/**
 * Render an interactive tool panel
 */
export function renderToolPanel(operation: ToolOperation): string {
  const inputsHtml =
    operation.inputs
      ?.map((input) => {
        if (input.type === "select") {
          return `
        <div class="tool-input-group">
          <label for="${input.id}">${input.label}</label>
          <select id="${input.id}" class="tool-input">
            ${input.options?.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join("")}
          </select>
        </div>
      `;
        } else if (input.type === "textarea") {
          return `
        <div class="tool-input-group">
          <label for="${input.id}">${input.label}</label>
          <textarea id="${input.id}" class="tool-input" placeholder="${input.placeholder || ""}">${
            input.defaultValue || ""
          }</textarea>
        </div>
      `;
        } else {
          return `
        <div class="tool-input-group">
          <label for="${input.id}">${input.label}</label>
          <input
            type="${input.type}"
            id="${input.id}"
            class="tool-input"
            placeholder="${input.placeholder || ""}"
            value="${input.defaultValue || ""}"
          />
        </div>
      `;
        }
      })
      .join("") || "";

  return `
    <div class="tool-panel" id="tool-${operation.id}">
      <div class="tool-panel-header" data-tool-id="${operation.id}">
        <div class="tool-panel-title">
          <span class="tool-panel-icon">▶</span>
          <span class="tool-panel-name">${operation.label}</span>
        </div>
        <div class="tool-panel-description">${operation.description}</div>
      </div>
      <div class="tool-panel-content">
        ${inputsHtml}
        <button class="button tool-execute-btn" data-tool-id="${operation.id}">
          Execute ${operation.label}
        </button>
        <div class="tool-result" id="result-${operation.id}"></div>
      </div>
    </div>
  `;
}

/**
 * Helper to get wallet instance
 */
function getWallet(): any {
  const wallet = (window as any)["wallet"];
  if (!wallet) {
    throw new Error("No wallet connected. Please connect a device first.");
  }
  return wallet;
}

/**
 * Helper to parse BIP32 path
 */
function parsePath(pathStr: string): number[] {
  const parts = pathStr.replace(/^m\//, "").split("/");
  return parts.map((part) => {
    const isHardened = part.endsWith("'") || part.endsWith("h");
    const num = parseInt(part.replace(/['h]$/, ""), 10);
    return isHardened ? num + 0x80000000 : num;
  });
}

/**
 * Bitcoin Developer Tools
 */
export const BITCOIN_TOOLS: ToolOperation[] = [
  {
    id: "btc-address",
    label: "Get Address",
    description: "Generate Bitcoin address for a given derivation path",
    category: "Addresses",
    inputs: [
      {
        id: "btc-addr-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/0'/0'/0/0",
        defaultValue: "m/44'/0'/0'/0/0",
      },
      {
        id: "btc-addr-type",
        label: "Address Type",
        type: "select",
        options: [
          { value: "legacy", label: "Legacy (P2PKH)" },
          { value: "segwit", label: "SegWit (P2SH-P2WPKH)" },
          { value: "native", label: "Native SegWit (Bech32)" },
          { value: "taproot", label: "Taproot (P2TR)" },
        ],
      },
    ],
    action: async () => {
      const wallet = getWallet();
      const pathStr = ($("#btc-addr-path") as any).val();
      const addrType = ($("#btc-addr-type") as any).val();

      const scriptTypeMap: any = {
        legacy: core.BTCInputScriptType.SpendAddress,
        segwit: core.BTCInputScriptType.SpendP2SHWitness,
        native: core.BTCInputScriptType.SpendWitness,
        taproot: core.BTCInputScriptType.SpendTaproot,
      };

      const result = await wallet.btcGetAddress({
        addressNList: parsePath(pathStr),
        coin: "Bitcoin",
        scriptType: scriptTypeMap[addrType] || core.BTCInputScriptType.SpendAddress,
        showDisplay: false,
      });

      return `Address: ${result}\nPath: ${pathStr}\nType: ${addrType}`;
    },
  },
  {
    id: "btc-xpub",
    label: "Get Extended Public Key",
    description: "Retrieve xpub/ypub/zpub for account-level derivation",
    category: "Keys",
    inputs: [
      {
        id: "btc-xpub-path",
        label: "Account Path",
        type: "text",
        placeholder: "m/44'/0'/0'",
        defaultValue: "m/44'/0'/0'",
      },
      {
        id: "btc-xpub-format",
        label: "Format",
        type: "select",
        options: [
          { value: "xpub", label: "xpub (Legacy)" },
          { value: "ypub", label: "ypub (SegWit)" },
          { value: "zpub", label: "zpub (Native SegWit)" },
        ],
      },
    ],
    action: async () => {
      const wallet = getWallet();
      const pathStr = ($("#btc-xpub-path") as any).val();
      const format = ($("#btc-xpub-format") as any).val();

      const scriptTypeMap: any = {
        xpub: core.BTCInputScriptType.SpendAddress,
        ypub: core.BTCInputScriptType.SpendP2SHWitness,
        zpub: core.BTCInputScriptType.SpendWitness,
      };

      const result = await wallet.getPublicKeys([
        {
          addressNList: parsePath(pathStr),
          coin: "Bitcoin",
          scriptType: scriptTypeMap[format] || core.BTCInputScriptType.SpendAddress,
          curve: "secp256k1",
        },
      ]);

      if (result && result.length > 0) {
        return `Extended Public Key (${format}):\n${result[0].xpub}\n\nPath: ${pathStr}`;
      }

      return "No result returned from wallet";
    },
  },
  {
    id: "btc-sign-message",
    label: "Sign Message",
    description: "Sign an arbitrary message with Bitcoin key",
    category: "Signing",
    inputs: [
      {
        id: "btc-sign-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/0'/0'/0/0",
        defaultValue: "m/44'/0'/0'/0/0",
      },
      {
        id: "btc-sign-message",
        label: "Message",
        type: "textarea",
        placeholder: "Enter message to sign...",
      },
    ],
    action: async () => "Message signing not yet connected",
  },
  {
    id: "btc-verify-message",
    label: "Verify Message",
    description: "Verify a signed Bitcoin message",
    category: "Signing",
    inputs: [
      {
        id: "btc-verify-address",
        label: "Address",
        type: "text",
        placeholder: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      },
      {
        id: "btc-verify-message",
        label: "Message",
        type: "textarea",
        placeholder: "Original message...",
      },
      {
        id: "btc-verify-signature",
        label: "Signature",
        type: "text",
        placeholder: "Signature to verify...",
      },
    ],
    action: async () => "Message verification not yet connected",
  },
  {
    id: "btc-sign-transaction",
    label: "Sign Transaction",
    description: "Sign a Bitcoin transaction",
    category: "Transactions",
    inputs: [
      {
        id: "btc-tx-json",
        label: "Transaction JSON",
        type: "textarea",
        placeholder: "Paste transaction JSON...",
      },
    ],
    action: async () => "Transaction signing not yet connected",
  },
];

/**
 * Ethereum Developer Tools
 */
export const ETHEREUM_TOOLS: ToolOperation[] = [
  {
    id: "eth-address",
    label: "Get Address",
    description: "Generate Ethereum address for a given derivation path",
    category: "Addresses",
    inputs: [
      {
        id: "eth-addr-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/60'/0'/0/0",
        defaultValue: "m/44'/60'/0'/0/0",
      },
      {
        id: "eth-addr-display",
        label: "Show on Device",
        type: "select",
        options: [
          { value: "false", label: "No" },
          { value: "true", label: "Yes" },
        ],
      },
    ],
    action: async () => {
      const wallet = getWallet();
      const pathStr = ($("#eth-addr-path") as any).val();
      const showDisplay = ($("#eth-addr-display") as any).val() === "true";

      const result = await wallet.ethGetAddress({
        addressNList: parsePath(pathStr),
        showDisplay: showDisplay,
      });

      return `Address: ${result}\nPath: ${pathStr}\nShown on device: ${showDisplay ? "Yes" : "No"}`;
    },
  },
  {
    id: "eth-sign-message",
    label: "Sign Message",
    description: "Sign an arbitrary message with Ethereum key",
    category: "Signing",
    inputs: [
      {
        id: "eth-sign-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/60'/0'/0/0",
        defaultValue: "m/44'/60'/0'/0/0",
      },
      {
        id: "eth-sign-message",
        label: "Message",
        type: "textarea",
        placeholder: "Enter message to sign...",
      },
    ],
    action: async () => "Message signing not yet connected",
  },
  {
    id: "eth-sign-typed-data",
    label: "Sign Typed Data (EIP-712)",
    description: "Sign structured data following EIP-712",
    category: "Signing",
    inputs: [
      {
        id: "eth-typed-data-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/60'/0'/0/0",
        defaultValue: "m/44'/60'/0'/0/0",
      },
      {
        id: "eth-typed-data-json",
        label: "Typed Data JSON",
        type: "textarea",
        placeholder: "Paste EIP-712 typed data...",
      },
    ],
    action: async () => "Typed data signing not yet connected",
  },
  {
    id: "eth-sign-transaction",
    label: "Sign Transaction",
    description: "Sign an Ethereum transaction",
    category: "Transactions",
    inputs: [
      {
        id: "eth-tx-json",
        label: "Transaction JSON",
        type: "textarea",
        placeholder: "Paste transaction JSON...",
      },
    ],
    action: async () => "Transaction signing not yet connected",
  },
];

/**
 * Cosmos Developer Tools
 */
export const COSMOS_TOOLS: ToolOperation[] = [
  {
    id: "cosmos-address",
    label: "Get Address",
    description: "Generate Cosmos (ATOM) address",
    category: "Addresses",
    inputs: [
      {
        id: "cosmos-addr-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/118'/0'/0/0",
        defaultValue: "m/44'/118'/0'/0/0",
      },
    ],
    action: async () => {
      const wallet = getWallet();
      const pathStr = ($("#cosmos-addr-path") as any).val();

      const result = await wallet.cosmosGetAddress({
        addressNList: parsePath(pathStr),
        showDisplay: false,
      });

      return `Address: ${result}\nPath: ${pathStr}`;
    },
  },
  {
    id: "cosmos-sign-message",
    label: "Sign Message",
    description: "Sign an arbitrary message with Cosmos key",
    category: "Signing",
    inputs: [
      {
        id: "cosmos-sign-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/118'/0'/0/0",
        defaultValue: "m/44'/118'/0'/0/0",
      },
      {
        id: "cosmos-sign-message",
        label: "Message",
        type: "textarea",
        placeholder: "Enter message to sign...",
      },
    ],
    action: async () => "Cosmos message signing not yet connected",
  },
];

/**
 * Litecoin Developer Tools
 */
export const LITECOIN_TOOLS: ToolOperation[] = [
  {
    id: "ltc-address",
    label: "Get Address",
    description: "Generate Litecoin address for a given derivation path",
    category: "Addresses",
    inputs: [
      {
        id: "ltc-addr-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/2'/0'/0/0",
        defaultValue: "m/44'/2'/0'/0/0",
      },
      {
        id: "ltc-addr-type",
        label: "Address Type",
        type: "select",
        options: [
          { value: "legacy", label: "Legacy (P2PKH)" },
          { value: "segwit", label: "SegWit (P2SH-P2WPKH)" },
          { value: "native", label: "Native SegWit (Bech32)" },
        ],
      },
    ],
    action: async () => {
      const wallet = getWallet();
      const pathStr = ($("#ltc-addr-path") as any).val();
      const addrType = ($("#ltc-addr-type") as any).val();

      const scriptTypeMap: any = {
        legacy: core.BTCInputScriptType.SpendAddress,
        segwit: core.BTCInputScriptType.SpendP2SHWitness,
        native: core.BTCInputScriptType.SpendWitness,
      };

      const result = await wallet.btcGetAddress({
        addressNList: parsePath(pathStr),
        coin: "Litecoin",
        scriptType: scriptTypeMap[addrType] || core.BTCInputScriptType.SpendAddress,
        showDisplay: false,
      });

      return `Address: ${result}\nPath: ${pathStr}\nType: ${addrType}`;
    },
  },
  {
    id: "ltc-xpub",
    label: "Get Extended Public Key",
    description: "Retrieve xpub for account-level derivation",
    category: "Keys",
    inputs: [
      {
        id: "ltc-xpub-path",
        label: "Account Path",
        type: "text",
        placeholder: "m/44'/2'/0'",
        defaultValue: "m/44'/2'/0'",
      },
      {
        id: "ltc-xpub-format",
        label: "Format",
        type: "select",
        options: [
          { value: "xpub", label: "Ltub (Legacy)" },
          { value: "ypub", label: "Mtub (SegWit)" },
        ],
      },
    ],
    action: async () => {
      const wallet = getWallet();
      const pathStr = ($("#ltc-xpub-path") as any).val();
      const format = ($("#ltc-xpub-format") as any).val();

      const scriptTypeMap: any = {
        xpub: core.BTCInputScriptType.SpendAddress,
        ypub: core.BTCInputScriptType.SpendP2SHWitness,
      };

      const result = await wallet.getPublicKeys([
        {
          addressNList: parsePath(pathStr),
          coin: "Litecoin",
          scriptType: scriptTypeMap[format] || core.BTCInputScriptType.SpendAddress,
          curve: "secp256k1",
        },
      ]);

      if (result && result.length > 0) {
        return `Extended Public Key (${format}):\n${result[0].xpub}\n\nPath: ${pathStr}`;
      }

      return "No result returned from wallet";
    },
  },
  {
    id: "ltc-sign-message",
    label: "Sign Message",
    description: "Sign an arbitrary message with Litecoin key",
    category: "Signing",
    inputs: [
      {
        id: "ltc-sign-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/2'/0'/0/0",
        defaultValue: "m/44'/2'/0'/0/0",
      },
      {
        id: "ltc-sign-message",
        label: "Message",
        type: "textarea",
        placeholder: "Enter message to sign...",
      },
    ],
    action: async () => {
      const wallet = getWallet();
      const pathStr = ($("#ltc-sign-path") as any).val();
      const message = ($("#ltc-sign-message") as any).val();

      const result = await wallet.btcSignMessage({
        addressNList: parsePath(pathStr),
        coin: "Litecoin",
        scriptType: core.BTCInputScriptType.SpendAddress,
        message: message,
      });

      return `Signature: ${result.signature}\nAddress: ${result.address}\nPath: ${pathStr}`;
    },
  },
  {
    id: "ltc-verify-message",
    label: "Verify Message",
    description: "Verify a signed Litecoin message",
    category: "Signing",
    inputs: [
      {
        id: "ltc-verify-address",
        label: "Address",
        type: "text",
        placeholder: "LTC address...",
      },
      {
        id: "ltc-verify-message",
        label: "Message",
        type: "textarea",
        placeholder: "Original message...",
      },
      {
        id: "ltc-verify-signature",
        label: "Signature",
        type: "text",
        placeholder: "Signature to verify...",
      },
    ],
    action: async () => "Message verification not yet connected",
  },
  {
    id: "ltc-sign-transaction",
    label: "Sign Transaction",
    description: "Sign a Litecoin transaction",
    category: "Transactions",
    inputs: [
      {
        id: "ltc-tx-json",
        label: "Transaction JSON",
        type: "textarea",
        placeholder: "Paste transaction JSON...",
      },
    ],
    action: async () => "Transaction signing not yet connected",
  },
];

/**
 * Dogecoin Developer Tools
 */
export const DOGECOIN_TOOLS: ToolOperation[] = [
  {
    id: "doge-address",
    label: "Get Address",
    description: "Generate Dogecoin address for a given derivation path",
    category: "Addresses",
    inputs: [
      {
        id: "doge-addr-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/3'/0'/0/0",
        defaultValue: "m/44'/3'/0'/0/0",
      },
      {
        id: "doge-addr-type",
        label: "Address Type",
        type: "select",
        options: [{ value: "legacy", label: "Legacy (P2PKH)" }],
      },
    ],
    action: async () => {
      const wallet = getWallet();
      const pathStr = ($("#doge-addr-path") as any).val();
      const addrType = ($("#doge-addr-type") as any).val();

      const result = await wallet.btcGetAddress({
        addressNList: parsePath(pathStr),
        coin: "Dogecoin",
        scriptType: core.BTCInputScriptType.SpendAddress,
        showDisplay: false,
      });

      return `Address: ${result}\nPath: ${pathStr}\nType: ${addrType}`;
    },
  },
  {
    id: "doge-xpub",
    label: "Get Extended Public Key",
    description: "Retrieve xpub for account-level derivation",
    category: "Keys",
    inputs: [
      {
        id: "doge-xpub-path",
        label: "Account Path",
        type: "text",
        placeholder: "m/44'/3'/0'",
        defaultValue: "m/44'/3'/0'",
      },
    ],
    action: async () => {
      const wallet = getWallet();
      const pathStr = ($("#doge-xpub-path") as any).val();

      const result = await wallet.getPublicKeys([
        {
          addressNList: parsePath(pathStr),
          coin: "Dogecoin",
          scriptType: core.BTCInputScriptType.SpendAddress,
          curve: "secp256k1",
        },
      ]);

      if (result && result.length > 0) {
        return `Extended Public Key:\n${result[0].xpub}\n\nPath: ${pathStr}`;
      }

      return "No result returned from wallet";
    },
  },
  {
    id: "doge-sign-message",
    label: "Sign Message",
    description: "Sign an arbitrary message with Dogecoin key",
    category: "Signing",
    inputs: [
      {
        id: "doge-sign-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/3'/0'/0/0",
        defaultValue: "m/44'/3'/0'/0/0",
      },
      {
        id: "doge-sign-message",
        label: "Message",
        type: "textarea",
        placeholder: "Enter message to sign...",
      },
    ],
    action: async () => {
      const wallet = getWallet();
      const pathStr = ($("#doge-sign-path") as any).val();
      const message = ($("#doge-sign-message") as any).val();

      const result = await wallet.btcSignMessage({
        addressNList: parsePath(pathStr),
        coin: "Dogecoin",
        scriptType: core.BTCInputScriptType.SpendAddress,
        message: message,
      });

      return `Signature: ${result.signature}\nAddress: ${result.address}\nPath: ${pathStr}`;
    },
  },
  {
    id: "doge-verify-message",
    label: "Verify Message",
    description: "Verify a signed Dogecoin message",
    category: "Signing",
    inputs: [
      {
        id: "doge-verify-address",
        label: "Address",
        type: "text",
        placeholder: "DOGE address...",
      },
      {
        id: "doge-verify-message",
        label: "Message",
        type: "textarea",
        placeholder: "Original message...",
      },
      {
        id: "doge-verify-signature",
        label: "Signature",
        type: "text",
        placeholder: "Signature to verify...",
      },
    ],
    action: async () => "Message verification not yet connected",
  },
  {
    id: "doge-sign-transaction",
    label: "Sign Transaction",
    description: "Sign a Dogecoin transaction",
    category: "Transactions",
    inputs: [
      {
        id: "doge-tx-json",
        label: "Transaction JSON",
        type: "textarea",
        placeholder: "Paste transaction JSON...",
      },
    ],
    action: async () => "Transaction signing not yet connected",
  },
];

/**
 * Ripple Developer Tools
 */
export const RIPPLE_TOOLS: ToolOperation[] = [
  {
    id: "ripple-address",
    label: "Get Address",
    description: "Generate Ripple (XRP) address",
    category: "Addresses",
    inputs: [
      {
        id: "ripple-addr-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/144'/0'/0/0",
        defaultValue: "m/44'/144'/0'/0/0",
      },
    ],
    action: async () => {
      const wallet = getWallet();
      const pathStr = ($("#ripple-addr-path") as any).val();

      const result = await wallet.rippleGetAddress({
        addressNList: parsePath(pathStr),
        showDisplay: false,
      });

      return `Address: ${result}\nPath: ${pathStr}`;
    },
  },
  {
    id: "ripple-sign-tx",
    label: "Sign Transaction",
    description: "Sign a Ripple (XRP) transaction",
    category: "Transactions",
    inputs: [
      {
        id: "ripple-tx-json",
        label: "Transaction JSON",
        type: "textarea",
        placeholder: "Paste Ripple transaction JSON...",
      },
    ],
    action: async () => "Ripple transaction signing not yet connected",
  },
];

/**
 * THORChain Developer Tools
 */
export const THORCHAIN_TOOLS: ToolOperation[] = [
  {
    id: "thorchain-address",
    label: "Get Address",
    description: "Generate THORChain (RUNE) address",
    category: "Addresses",
    inputs: [
      {
        id: "thorchain-addr-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/931'/0'/0/0",
        defaultValue: "m/44'/931'/0'/0/0",
      },
    ],
    action: async () => {
      const wallet = getWallet();
      const pathStr = ($("#thorchain-addr-path") as any).val();

      const result = await wallet.thorchainGetAddress({
        addressNList: parsePath(pathStr),
        showDisplay: false,
      });

      return `Address: ${result}\nPath: ${pathStr}`;
    },
  },
  {
    id: "thorchain-sign-message",
    label: "Sign Message",
    description: "Sign an arbitrary message with THORChain key",
    category: "Signing",
    inputs: [
      {
        id: "thorchain-sign-path",
        label: "Derivation Path",
        type: "text",
        placeholder: "m/44'/931'/0'/0/0",
        defaultValue: "m/44'/931'/0'/0/0",
      },
      {
        id: "thorchain-sign-message",
        label: "Message",
        type: "textarea",
        placeholder: "Enter message to sign...",
      },
    ],
    action: async () => "THORChain message signing not yet connected",
  },
];

/**
 * Initialize interactive tool panels
 */
export function initializeToolPanels(containerId: string, tools: ToolOperation[]): void {
  const container = $(`#${containerId}`);

  // Group tools by category
  const categories = new Map<string, ToolOperation[]>();
  tools.forEach((tool) => {
    const category = tool.category || "General";
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(tool);
  });

  // Render categories and tools
  categories.forEach((categoryTools, categoryName) => {
    const categoryHtml = `
      <div class="tool-category">
        <h5 class="tool-category-name">${categoryName}</h5>
        ${categoryTools.map((tool) => renderToolPanel(tool)).join("")}
      </div>
    `;
    container.append(categoryHtml);
  });

  // Add toggle handlers for this container
  container.on("click", ".tool-panel-header", function () {
    const panel = $(this).closest(".tool-panel");
    panel.toggleClass("expanded");
    const icon = panel.find(".tool-panel-icon");
    icon.text(panel.hasClass("expanded") ? "▼" : "▶");
  });

  // Add execute button handlers for this container
  container.on("click", ".tool-execute-btn", async function () {
    const toolId = $(this).data("tool-id");
    const tool = tools.find((t) => t.id === toolId);

    if (!tool) {
      console.error(`Tool not found: ${toolId}`);
      return;
    }

    const resultDiv = $(`#result-${toolId}`);
    resultDiv.removeClass("success error").text("⏳ Executing...");

    try {
      const result = await tool.action();
      resultDiv.addClass("success").text(result);
    } catch (error) {
      resultDiv.addClass("error").text(`Error: ${error.message || error}`);
    }
  });
}

/**
 * CSS for tool panels
 */
export const TOOL_PANEL_CSS = `
  .tool-category {
    margin-bottom: 2em;
  }

  .tool-category-name {
    color: var(--keepkey-gold);
    font-size: 1.3em;
    font-weight: 600;
    margin: 0 0 1em 0;
    padding-bottom: 0.5em;
    border-bottom: 2px solid rgba(247, 147, 26, 0.3);
  }

  .tool-panel {
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(247, 147, 26, 0.2);
    border-radius: 8px;
    margin-bottom: 1em;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .tool-panel:hover {
    border-color: rgba(247, 147, 26, 0.4);
  }

  .tool-panel.expanded {
    border-color: var(--keepkey-gold);
  }

  .tool-panel-header {
    padding: 1.2em;
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;
  }

  .tool-panel-header:hover {
    background: rgba(247, 147, 26, 0.1);
  }

  .tool-panel-title {
    display: flex;
    align-items: center;
    gap: 0.8em;
    margin-bottom: 0.5em;
  }

  .tool-panel-icon {
    color: var(--keepkey-gold);
    font-size: 0.9em;
    transition: transform 0.3s;
  }

  .tool-panel-name {
    font-size: 1.2em;
    font-weight: 600;
    color: var(--keepkey-white);
  }

  .tool-panel-description {
    font-size: 0.95em;
    opacity: 0.7;
    margin-left: 1.7em;
  }

  .tool-panel-content {
    display: none;
    padding: 0 1.2em 1.2em 1.2em;
  }

  .tool-panel.expanded .tool-panel-content {
    display: block;
  }

  .tool-input-group {
    margin-bottom: 1em;
  }

  .tool-input-group label {
    display: block;
    margin-bottom: 0.5em;
    font-weight: 600;
    color: var(--keepkey-gold);
    font-size: 0.95em;
  }

  .tool-input {
    width: 100%;
    padding: 0.8em;
    background: var(--keepkey-gray);
    border: 2px solid rgba(247, 147, 26, 0.3);
    border-radius: 6px;
    color: var(--keepkey-white);
    font-family: 'Courier New', monospace;
    font-size: 0.95em;
  }

  .tool-input:focus {
    border-color: var(--keepkey-gold);
    outline: none;
  }

  .tool-input select,
  select.tool-input {
    padding: 1em 3em 1em 1em;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23F7931A' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1em center;
    background-size: 12px;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 0.9em;
    line-height: 1.5;
    min-height: 45px;
  }

  .tool-input[type="textarea"],
  .tool-input textarea {
    min-height: 100px;
    resize: vertical;
  }

  .tool-execute-btn {
    width: 100%;
    margin-top: 1em;
    padding: 1em !important;
    font-size: 1.1em !important;
    font-weight: 700 !important;
  }

  .tool-result {
    margin-top: 1.5em;
    padding: 1em;
    background: var(--keepkey-black);
    border: 2px solid rgba(247, 147, 26, 0.3);
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    min-height: 60px;
    word-break: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    display: none;
    max-height: 400px;
    overflow-y: auto;
  }

  .tool-result:not(:empty) {
    display: block;
  }

  .tool-result.success {
    border-color: var(--keepkey-success);
    color: var(--keepkey-success);
  }

  .tool-result.error {
    border-color: var(--keepkey-error);
    color: var(--keepkey-error);
  }
`;
// Force rebuild
