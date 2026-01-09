#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Configuration from environment variables
const UNIFI_BASE_URL = process.env.UNIFI_BASE_URL || "";
const UNIFI_API_KEY = process.env.UNIFI_API_KEY || "";

if (!UNIFI_BASE_URL || !UNIFI_API_KEY) {
  console.error("Error: UNIFI_BASE_URL and UNIFI_API_KEY environment variables are required");
  process.exit(1);
}

// Helper function to make UniFi API requests
async function unifiRequest(
  endpoint: string,
  method: string = "GET",
  body?: Record<string, unknown>
): Promise<unknown> {
  const url = `${UNIFI_BASE_URL}/proxy/network/integration${endpoint}`;

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "X-API-KEY": UNIFI_API_KEY,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`UniFi API error (${response.status}): ${errorText}`);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}

// Create the MCP server
const server = new Server(
  {
    name: "unifi-network-mcp",
    version: "1.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define all tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ============================================
      // APPLICATION INFO
      // ============================================
      {
        name: "unifi_get_info",
        description: "Get application information including version and whether it's a UniFi OS Console",
        inputSchema: { type: "object", properties: {}, required: [] },
      },

      // ============================================
      // SITES
      // ============================================
      {
        name: "unifi_list_sites",
        description: "List all sites available to the API key",
        inputSchema: { type: "object", properties: {}, required: [] },
      },

      // ============================================
      // DEVICES
      // ============================================
      {
        name: "unifi_list_devices",
        description: "List all devices at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_device",
        description: "Get a specific device by ID",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            deviceId: { type: "string", description: "Device ID" },
          },
          required: ["siteId", "deviceId"],
        },
      },
      {
        name: "unifi_get_device_statistics",
        description: "Get latest statistics for a device",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            deviceId: { type: "string", description: "Device ID" },
          },
          required: ["siteId", "deviceId"],
        },
      },
      {
        name: "unifi_adopt_device",
        description: "Adopt a pending device",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            deviceId: { type: "string", description: "Device ID" },
          },
          required: ["siteId", "deviceId"],
        },
      },
      {
        name: "unifi_restart_device",
        description: "Restart a device",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            deviceId: { type: "string", description: "Device ID" },
          },
          required: ["siteId", "deviceId"],
        },
      },
      {
        name: "unifi_locate_device",
        description: "Enable or disable the locate function (flashing LED) on a device",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            deviceId: { type: "string", description: "Device ID" },
            enabled: { type: "boolean", description: "Enable or disable locate mode" },
          },
          required: ["siteId", "deviceId", "enabled"],
        },
      },

      // ============================================
      // CLIENTS
      // ============================================
      {
        name: "unifi_list_clients",
        description: "List all clients (connected devices/users) at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_client",
        description: "Get a specific client by ID",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            clientId: { type: "string", description: "Client ID" },
          },
          required: ["siteId", "clientId"],
        },
      },
      {
        name: "unifi_authorize_guest",
        description: "Authorize a guest client on a hotspot network",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            clientId: { type: "string", description: "Client ID" },
            expiresAt: { type: "string", description: "ISO 8601 timestamp when authorization expires" },
            usageQuota: {
              type: "object",
              description: "Optional usage limits",
              properties: {
                dataTx: { type: "number", description: "Upload limit in bytes" },
                dataRx: { type: "number", description: "Download limit in bytes" },
                dataTotal: { type: "number", description: "Total data limit in bytes" },
              },
            },
          },
          required: ["siteId", "clientId", "expiresAt"],
        },
      },

      // ============================================
      // NETWORKS
      // ============================================
      {
        name: "unifi_list_networks",
        description: "List all networks at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_network",
        description: "Get a specific network by ID",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            networkId: { type: "string", description: "Network ID" },
          },
          required: ["siteId", "networkId"],
        },
      },
      {
        name: "unifi_create_network",
        description: "Create a new network",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            name: { type: "string", description: "Network name" },
            purpose: { type: "string", enum: ["corporate", "guest", "wan", "vlan-only"], description: "Network purpose" },
            vlanId: { type: "number", description: "VLAN ID (1-4094)" },
            dhcpEnabled: { type: "boolean", description: "Enable DHCP server" },
            dhcpStart: { type: "string", description: "DHCP range start IP" },
            dhcpStop: { type: "string", description: "DHCP range end IP" },
            gateway: { type: "string", description: "Gateway IP address" },
            subnet: { type: "string", description: "Subnet in CIDR notation (e.g., 192.168.1.0/24)" },
            domainName: { type: "string", description: "Domain name for the network" },
            internetAccessEnabled: { type: "boolean", description: "Allow internet access" },
          },
          required: ["siteId", "name", "purpose"],
        },
      },
      {
        name: "unifi_update_network",
        description: "Update an existing network",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            networkId: { type: "string", description: "Network ID" },
            name: { type: "string", description: "Network name" },
            purpose: { type: "string", enum: ["corporate", "guest", "wan", "vlan-only"], description: "Network purpose" },
            vlanId: { type: "number", description: "VLAN ID (1-4094)" },
            dhcpEnabled: { type: "boolean", description: "Enable DHCP server" },
            dhcpStart: { type: "string", description: "DHCP range start IP" },
            dhcpStop: { type: "string", description: "DHCP range end IP" },
            gateway: { type: "string", description: "Gateway IP address" },
            subnet: { type: "string", description: "Subnet in CIDR notation" },
            domainName: { type: "string", description: "Domain name for the network" },
            internetAccessEnabled: { type: "boolean", description: "Allow internet access" },
          },
          required: ["siteId", "networkId"],
        },
      },
      {
        name: "unifi_delete_network",
        description: "Delete a network",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            networkId: { type: "string", description: "Network ID" },
          },
          required: ["siteId", "networkId"],
        },
      },

      // ============================================
      // HOTSPOT VOUCHERS
      // ============================================
      {
        name: "unifi_list_vouchers",
        description: "List all hotspot vouchers at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_voucher",
        description: "Get a specific hotspot voucher by ID",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            voucherId: { type: "string", description: "Voucher ID" },
          },
          required: ["siteId", "voucherId"],
        },
      },
      {
        name: "unifi_create_voucher",
        description: "Create hotspot vouchers",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            count: { type: "number", description: "Number of vouchers to create" },
            duration: { type: "number", description: "Duration in minutes" },
            usageQuota: {
              type: "object",
              description: "Optional usage limits",
              properties: {
                dataTx: { type: "number", description: "Upload limit in bytes" },
                dataRx: { type: "number", description: "Download limit in bytes" },
                dataTotal: { type: "number", description: "Total data limit in bytes" },
              },
            },
            multiUse: { type: "boolean", description: "Allow multiple uses" },
            maxUses: { type: "number", description: "Maximum number of uses (if multiUse is true)" },
            note: { type: "string", description: "Note/description for the vouchers" },
          },
          required: ["siteId", "count", "duration"],
        },
      },
      {
        name: "unifi_update_voucher",
        description: "Update a hotspot voucher",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            voucherId: { type: "string", description: "Voucher ID" },
            note: { type: "string", description: "Note/description for the voucher" },
          },
          required: ["siteId", "voucherId"],
        },
      },
      {
        name: "unifi_delete_voucher",
        description: "Delete a hotspot voucher",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            voucherId: { type: "string", description: "Voucher ID" },
          },
          required: ["siteId", "voucherId"],
        },
      },

      // ============================================
      // WAN
      // ============================================
      {
        name: "unifi_list_wans",
        description: "List all WAN interfaces at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const args = (rawArgs || {}) as Record<string, unknown>;

  try {
    let result: unknown;

    switch (name) {
      // ============================================
      // APPLICATION INFO
      // ============================================
      case "unifi_get_info":
        result = await unifiRequest("/v1/info");
        break;

      // ============================================
      // SITES
      // ============================================
      case "unifi_list_sites":
        result = await unifiRequest("/v1/sites");
        break;

      // ============================================
      // DEVICES
      // ============================================
      case "unifi_list_devices":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices`);
        break;

      case "unifi_get_device":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices/${args.deviceId}`);
        break;

      case "unifi_get_device_statistics":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices/${args.deviceId}/statistics/latest`);
        break;

      case "unifi_adopt_device":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices/${args.deviceId}/actions/adopt`, "POST");
        break;

      case "unifi_restart_device":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices/${args.deviceId}/actions/restart`, "POST");
        break;

      case "unifi_locate_device":
        result = await unifiRequest(
          `/v1/sites/${args.siteId}/devices/${args.deviceId}/actions/locate`,
          "POST",
          { enabled: args.enabled }
        );
        break;

      // ============================================
      // CLIENTS
      // ============================================
      case "unifi_list_clients":
        result = await unifiRequest(`/v1/sites/${args.siteId}/clients`);
        break;

      case "unifi_get_client":
        result = await unifiRequest(`/v1/sites/${args.siteId}/clients/${args.clientId}`);
        break;

      case "unifi_authorize_guest": {
        const authBody: Record<string, unknown> = { expiresAt: args.expiresAt };
        if (args.usageQuota) authBody.usageQuota = args.usageQuota;
        result = await unifiRequest(
          `/v1/sites/${args.siteId}/clients/${args.clientId}/actions/authorizeGuest`,
          "POST",
          authBody
        );
        break;
      }

      // ============================================
      // NETWORKS
      // ============================================
      case "unifi_list_networks":
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks`);
        break;

      case "unifi_get_network":
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks/${args.networkId}`);
        break;

      case "unifi_create_network": {
        const networkBody: Record<string, unknown> = {
          name: args.name,
          purpose: args.purpose,
        };
        if (args.vlanId !== undefined) networkBody.vlanId = args.vlanId;
        if (args.dhcpEnabled !== undefined) networkBody.dhcpEnabled = args.dhcpEnabled;
        if (args.dhcpStart) networkBody.dhcpStart = args.dhcpStart;
        if (args.dhcpStop) networkBody.dhcpStop = args.dhcpStop;
        if (args.gateway) networkBody.gateway = args.gateway;
        if (args.subnet) networkBody.subnet = args.subnet;
        if (args.domainName) networkBody.domainName = args.domainName;
        if (args.internetAccessEnabled !== undefined) networkBody.internetAccessEnabled = args.internetAccessEnabled;
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks`, "POST", networkBody);
        break;
      }

      case "unifi_update_network": {
        const updateNetworkBody: Record<string, unknown> = {};
        if (args.name) updateNetworkBody.name = args.name;
        if (args.purpose) updateNetworkBody.purpose = args.purpose;
        if (args.vlanId !== undefined) updateNetworkBody.vlanId = args.vlanId;
        if (args.dhcpEnabled !== undefined) updateNetworkBody.dhcpEnabled = args.dhcpEnabled;
        if (args.dhcpStart) updateNetworkBody.dhcpStart = args.dhcpStart;
        if (args.dhcpStop) updateNetworkBody.dhcpStop = args.dhcpStop;
        if (args.gateway) updateNetworkBody.gateway = args.gateway;
        if (args.subnet) updateNetworkBody.subnet = args.subnet;
        if (args.domainName) updateNetworkBody.domainName = args.domainName;
        if (args.internetAccessEnabled !== undefined) updateNetworkBody.internetAccessEnabled = args.internetAccessEnabled;
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks/${args.networkId}`, "PUT", updateNetworkBody);
        break;
      }

      case "unifi_delete_network":
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks/${args.networkId}`, "DELETE");
        break;

      // ============================================
      // HOTSPOT VOUCHERS
      // ============================================
      case "unifi_list_vouchers":
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspotVouchers`);
        break;

      case "unifi_get_voucher":
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspotVouchers/${args.voucherId}`);
        break;

      case "unifi_create_voucher": {
        const voucherBody: Record<string, unknown> = {
          count: args.count,
          duration: args.duration,
        };
        if (args.usageQuota) voucherBody.usageQuota = args.usageQuota;
        if (args.multiUse !== undefined) voucherBody.multiUse = args.multiUse;
        if (args.maxUses !== undefined) voucherBody.maxUses = args.maxUses;
        if (args.note) voucherBody.note = args.note;
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspotVouchers`, "POST", voucherBody);
        break;
      }

      case "unifi_update_voucher": {
        const updateVoucherBody: Record<string, unknown> = {};
        if (args.note) updateVoucherBody.note = args.note;
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspotVouchers/${args.voucherId}`, "PUT", updateVoucherBody);
        break;
      }

      case "unifi_delete_voucher":
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspotVouchers/${args.voucherId}`, "DELETE");
        break;

      // ============================================
      // WAN
      // ============================================
      case "unifi_list_wans":
        result = await unifiRequest(`/v1/sites/${args.siteId}/wans`);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("UniFi Network MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
