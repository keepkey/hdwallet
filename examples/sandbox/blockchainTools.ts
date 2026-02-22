/**
 * Blockchain Tools Component
 *
 * Renders blockchain-specific tool interfaces with chain info headers
 */

import $ from "jquery";
import { ChainConfig } from "./chains";

/**
 * Render a blockchain tool header with icon, name, and CAIP
 */
export function renderBlockchainHeader(chain: ChainConfig): string {
  return `
    <div class="blockchain-header">
      <div class="blockchain-header-info">
        ${chain.icon ? `<img src="${chain.icon}" alt="${chain.name}" class="blockchain-header-icon" />` : ''}
        <div class="blockchain-header-text">
          <h3 class="blockchain-header-name" style="color: ${chain.color};">${chain.name}</h3>
          <div class="blockchain-header-caip">${chain.caip || 'No CAIP identifier'}</div>
          <div class="blockchain-header-arch">${chain.architecture} Architecture</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Inject blockchain headers into existing content sections
 */
export function initializeBlockchainHeaders(chains: ChainConfig[]): void {
  chains.forEach(chain => {
    const contentElement = $(`#blockchain-${chain.id}`);
    if (contentElement.length > 0) {
      // Check if header already exists
      if (contentElement.find('.blockchain-header').length === 0) {
        const header = renderBlockchainHeader(chain);
        contentElement.prepend(header);
      }
    }
  });

  console.log('✅ Initialized blockchain tool headers');
}

/**
 * Enhanced blockchain tool section CSS
 */
export const BLOCKCHAIN_TOOLS_CSS = `
  /* Blockchain Tool Content */
  .blockchain-content {
    background-color: var(--keepkey-dark);
    border: 2px solid var(--keepkey-gold);
    border-radius: 12px;
    padding: 2.5em;
    margin-top: 2em;
  }

  /* Blockchain Header */
  .blockchain-header {
    background: linear-gradient(135deg, rgba(247, 147, 26, 0.1) 0%, rgba(247, 147, 26, 0.05) 100%);
    border: 2px solid rgba(247, 147, 26, 0.3);
    border-radius: 12px;
    padding: 2em;
    margin-bottom: 2.5em;
  }

  .blockchain-header-info {
    display: flex;
    align-items: center;
    gap: 1.5em;
  }

  .blockchain-header-icon {
    width: 80px;
    height: 80px;
    object-fit: contain;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    padding: 10px;
    border: 3px solid rgba(247, 147, 26, 0.5);
  }

  .blockchain-header-text {
    flex: 1;
  }

  .blockchain-header-name {
    font-size: 2.2em;
    font-weight: 700;
    margin: 0 0 0.3em 0;
    line-height: 1.2;
  }

  .blockchain-header-caip {
    font-family: 'Courier New', monospace;
    font-size: 1.15em;
    color: var(--keepkey-light-gray);
    opacity: 0.9;
    margin-bottom: 0.5em;
    word-break: break-all;
  }

  .blockchain-header-arch {
    font-size: 1em;
    opacity: 0.7;
    color: var(--keepkey-gold);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Tool Sections */
  .blockchain-content h4 {
    color: var(--keepkey-gold);
    font-size: 1.6em;
    margin: 2em 0 1em 0;
    font-weight: 700;
  }

  .blockchain-content h5 {
    color: var(--keepkey-gold);
    font-size: 1.3em;
    margin: 2em 0 1em 0;
    font-weight: 600;
    opacity: 0.9;
  }

  /* Button groups */
  .blockchain-content .button-group {
    margin-bottom: 1.5em;
  }

  /* Inputs and textareas */
  .blockchain-content input[type="text"],
  .blockchain-content textarea {
    width: 100%;
    margin-bottom: 1em;
  }
`;
