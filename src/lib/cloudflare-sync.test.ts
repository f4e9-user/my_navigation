import { describe, expect, it } from "vitest";
import {
  extractTunnelHostnames,
  filterAssetsByAllowedDomains,
  mergeDiscoveredAssets,
  normalizeAllowedRootDomains,
  toPublicAsset,
  type DiscoveredAsset,
} from "./cloudflare-sync";

describe("cloudflare sync helpers", () => {
  it("normalizes allowed root domains", () => {
    expect(normalizeAllowedRootDomains(" Example.COM, example.net ,, ")).toEqual([
      "example.com",
      "example.net",
    ]);
  });

  it("filters hostnames to exact root domains or subdomains only", () => {
    const assets: DiscoveredAsset[] = [
      { hostname: "example.com", rootDomain: "example.com", sources: ["dns"] },
      { hostname: "admin.example.com", rootDomain: "example.com", sources: ["dns"] },
      { hostname: "badexample.com", rootDomain: "example.com", sources: ["dns"] },
      { hostname: "other.net", rootDomain: "other.net", sources: ["dns"] },
    ];

    expect(filterAssetsByAllowedDomains(assets, ["example.com"]).map((asset) => asset.hostname)).toEqual([
      "example.com",
      "admin.example.com",
    ]);
  });

  it("extracts only tunnel ingress hostnames inside allowed domains", () => {
    const config = {
      config: {
        ingress: [
          { hostname: "app.example.com", service: "http://localhost:3000" },
          { hostname: "grafana.example.net", service: "http://localhost:3001" },
          { service: "http_status:404" },
        ],
      },
    };

    expect(
      extractTunnelHostnames(config, {
        tunnelId: "tun-1",
        tunnelName: "main",
        allowedRootDomains: ["example.com"],
      }),
    ).toEqual([
      {
        hostname: "app.example.com",
        rootDomain: "example.com",
        sources: ["tunnel"],
        tunnelId: "tun-1",
        tunnelName: "main",
        tunnelService: "http://localhost:3000",
      },
    ]);
  });

  it("merges DNS and tunnel data for the same hostname without losing source-specific fields", () => {
    const merged = mergeDiscoveredAssets([
      {
        hostname: "app.example.com",
        rootDomain: "example.com",
        sources: ["dns"],
        dnsRecordType: "CNAME",
        dnsValue: "abc.cfargotunnel.com",
        proxied: true,
        ttl: 1,
      },
      {
        hostname: "app.example.com",
        rootDomain: "example.com",
        sources: ["tunnel"],
        tunnelId: "tun-1",
        tunnelName: "main",
        tunnelService: "http://localhost:3000",
      },
    ]);

    expect(merged).toEqual([
      {
        hostname: "app.example.com",
        rootDomain: "example.com",
        sources: ["dns", "tunnel"],
        dnsRecordType: "CNAME",
        dnsValue: "abc.cfargotunnel.com",
        proxied: true,
        ttl: 1,
        tunnelId: "tun-1",
        tunnelName: "main",
        tunnelService: "http://localhost:3000",
      },
    ]);
  });

  it("public assets expose only display fields and never internal Cloudflare values", () => {
    const publicAsset = toPublicAsset({
      hostname: "admin.example.com",
      profile: {
        displayName: "管理后台",
        description: "业务管理后台",
        category: "生产系统",
        icon: "",
      },
      dnsValue: "secret-target.example.internal",
      tunnelService: "http://localhost:3000",
    });

    expect(publicAsset).toEqual({
      displayName: "管理后台",
      hostname: "admin.example.com",
      url: "https://admin.example.com",
      description: "业务管理后台",
      category: "生产系统",
      icon: "",
    });
    expect(JSON.stringify(publicAsset)).not.toContain("secret-target");
    expect(JSON.stringify(publicAsset)).not.toContain("localhost");
  });
});
