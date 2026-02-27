/**
 * Chain Configuration
 *
 * Uses CAIP-2 identifiers for blockchain chains
 * Icons are served from KeepKey CDN using base64-encoded CAIP identifiers
 */

export interface ChainConfig {
  /** Chain ID (tab identifier) */
  id: string;
  /** Display name */
  name: string;
  /** CAIP-2 network identifier */
  caip: string;
  /** Icon URL from KeepKey CDN */
  icon: string;
  /** Brand color for UI theming */
  color: string;
  /** Sort order */
  sortOrder: number;
  /** Content element ID */
  contentId: string;
  /** Architecture/consensus type */
  architecture: 'UTXO' | 'EVM' | 'Tendermint' | 'XRP' | 'Other';
}

/**
 * Get icon URL for a CAIP identifier
 */
function getIconUrl(caip: string): string {
  try {
    const base64Caip = btoa(caip);
    return `https://api.keepkey.info/coins/${base64Caip}.png`;
  } catch (error) {
    console.error('Error encoding CAIP to base64:', error);
    return '';
  }
}

/**
 * Main blockchain chains supported in the sandbox
 */
export const CHAIN_CONFIGS: ChainConfig[] = [
  // UTXO Chains
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    caip: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    icon: getIconUrl('bip122:000000000019d6689c085ae165831e93/slip44:0'),
    color: '#F7931A',
    sortOrder: 0,
    contentId: 'blockchain-bitcoin',
    architecture: 'UTXO'
  },
  {
    id: 'litecoin',
    name: 'Litecoin',
    caip: 'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2',
    icon: getIconUrl('bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2'),
    color: '#345D9D',
    sortOrder: 1,
    contentId: 'blockchain-litecoin',
    architecture: 'UTXO'
  },
  {
    id: 'dogecoin',
    name: 'Dogecoin',
    caip: 'bip122:1a91e3dace36e2be3bf030a65679fe82/slip44:3',
    icon: getIconUrl('bip122:1a91e3dace36e2be3bf030a65679fe82/slip44:3'),
    color: '#C2A633',
    sortOrder: 2,
    contentId: 'blockchain-dogecoin',
    architecture: 'UTXO'
  },
  {
    id: 'bitcoincash',
    name: 'Bitcoin Cash',
    caip: 'bip122:000000000000000000651ef99cb9fcbe/slip44:145',
    icon: getIconUrl('bip122:000000000000000000651ef99cb9fcbe/slip44:145'),
    color: '#8DC351',
    sortOrder: 3,
    contentId: 'blockchain-other',
    architecture: 'UTXO'
  },
  {
    id: 'dash',
    name: 'Dash',
    caip: 'bip122:00000ffd590b1485b3caadc19b22e637/slip44:5',
    icon: getIconUrl('bip122:00000ffd590b1485b3caadc19b22e637/slip44:5'),
    color: '#008DE4',
    sortOrder: 4,
    contentId: 'blockchain-other',
    architecture: 'UTXO'
  },
  // EVM Chains
  {
    id: 'ethereum',
    name: 'Ethereum',
    caip: 'eip155:1/slip44:60',
    icon: getIconUrl('eip155:1/slip44:60'),
    color: '#627EEA',
    sortOrder: 5,
    contentId: 'blockchain-ethereum',
    architecture: 'EVM'
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    caip: 'eip155:43114/slip44:60',
    icon: getIconUrl('eip155:43114/slip44:60'),
    color: '#E84142',
    sortOrder: 7,
    contentId: 'blockchain-other',
    architecture: 'EVM'
  },
  {
    id: 'polygon',
    name: 'Polygon',
    caip: 'eip155:137/slip44:60',
    icon: getIconUrl('eip155:137/slip44:60'),
    color: '#8247E5',
    sortOrder: 8,
    contentId: 'blockchain-other',
    architecture: 'EVM'
  },
  // Tendermint Chains
  {
    id: 'cosmos',
    name: 'Cosmos',
    caip: 'cosmos:cosmoshub-4/slip44:118',
    icon: getIconUrl('cosmos:cosmoshub-4/slip44:118'),
    color: '#2E3148',
    sortOrder: 7,
    contentId: 'blockchain-cosmos',
    architecture: 'Tendermint'
  },
  {
    id: 'thorchain',
    name: 'THORChain',
    caip: 'cosmos:thorchain-1/slip44:931',
    icon: getIconUrl('cosmos:thorchain-1/slip44:931'),
    color: '#00CCFF',
    sortOrder: 8,
    contentId: 'blockchain-thorchain',
    architecture: 'Tendermint'
  },
  {
    id: 'osmosis',
    name: 'Osmosis',
    caip: 'cosmos:osmosis-1/slip44:118',
    icon: getIconUrl('cosmos:osmosis-1/slip44:118'),
    color: '#5E12A0',
    sortOrder: 9,
    contentId: 'blockchain-cosmos',
    architecture: 'Tendermint'
  },
  {
    id: 'mayachain',
    name: 'MAYAChain',
    caip: 'cosmos:mayachain-1/slip44:931',
    icon: getIconUrl('cosmos:mayachain-1/slip44:931'),
    color: '#00D4AA',
    sortOrder: 10,
    contentId: 'blockchain-thorchain',
    architecture: 'Tendermint'
  },
  // XRP Ledger
  {
    id: 'ripple',
    name: 'Ripple',
    caip: 'ripple:1/slip44:144',
    icon: getIconUrl('ripple:1/slip44:144'),
    color: '#23292F',
    sortOrder: 13,
    contentId: 'blockchain-ripple',
    architecture: 'XRP'
  },
  // Debug
  {
    id: 'debug',
    name: 'Debug',
    caip: '',
    icon: '',
    color: '#FF6B6B',
    sortOrder: 14,
    contentId: 'blockchain-debug',
    architecture: 'Other'
  }
];

/**
 * Additional chain data for "Other Chains" tab
 */
export const OTHER_CHAINS: Omit<ChainConfig, 'sortOrder' | 'contentId'>[] = [
  {
    id: 'litecoin',
    name: 'Litecoin',
    caip: 'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2',
    icon: getIconUrl('bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2'),
    color: '#345D9D',
  },
  {
    id: 'dogecoin',
    name: 'Dogecoin',
    caip: 'bip122:1a91e3dace36e2be3bf030a65679fe82/slip44:3',
    icon: getIconUrl('bip122:1a91e3dace36e2be3bf030a65679fe82/slip44:3'),
    color: '#C2A633',
  },
  {
    id: 'ripple',
    name: 'Ripple',
    caip: 'ripple:1/slip44:144',
    icon: getIconUrl('ripple:1/slip44:144'),
    color: '#23292F',
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    caip: 'eip155:43114/slip44:60',
    icon: getIconUrl('eip155:43114/slip44:60'),
    color: '#E84142',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    caip: 'eip155:137/slip44:60',
    icon: getIconUrl('eip155:137/slip44:60'),
    color: '#8247E5',
  },
];

/**
 * Get chain config by ID
 */
export function getChainConfig(id: string): ChainConfig | undefined {
  return CHAIN_CONFIGS.find(chain => chain.id === id);
}

/**
 * Get all chains sorted by sortOrder
 */
export function getAllChains(): ChainConfig[] {
  return [...CHAIN_CONFIGS].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Group chains by architecture type
 */
export function getChainsByArchitecture(): Map<string, ChainConfig[]> {
  const groups = new Map<string, ChainConfig[]>();

  CHAIN_CONFIGS.forEach(chain => {
    if (!chain.caip) return; // Skip chains without CAIP (like Debug)

    const arch = chain.architecture;
    if (!groups.has(arch)) {
      groups.set(arch, []);
    }
    groups.get(arch)!.push(chain);
  });

  return groups;
}

/**
 * Get architecture group display info
 */
export function getArchitectureInfo(arch: string): { name: string, description: string, color: string } {
  const info: Record<string, { name: string, description: string, color: string }> = {
    'UTXO': {
      name: 'UTXO Chains',
      description: 'Bitcoin-based unspent transaction output model',
      color: '#F7931A'
    },
    'EVM': {
      name: 'EVM Chains',
      description: 'Ethereum Virtual Machine compatible networks',
      color: '#627EEA'
    },
    'Tendermint': {
      name: 'Cosmos Ecosystem',
      description: 'Tendermint consensus-based chains',
      color: '#2E3148'
    },
    'XRP': {
      name: 'XRP Ledger',
      description: 'Ripple consensus protocol',
      color: '#23292F'
    }
  };

  return info[arch] || { name: arch, description: '', color: '#888888' };
}
