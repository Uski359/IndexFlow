import { campaignConfigs, type CampaignConfig } from './campaigns.js';

const campaignIndex = new Map<string, CampaignConfig>(
  campaignConfigs.map((campaign) => [campaign.id, campaign])
);

const normalizeCampaignId = (campaignId: string) => campaignId.trim();

export const getCampaign = (campaignId: string): CampaignConfig | undefined =>
  campaignIndex.get(normalizeCampaignId(campaignId));

export const listCampaigns = (): CampaignConfig[] => Array.from(campaignIndex.values());

export const getCampaignTargets = (campaignId: string): string[] => {
  const campaign = getCampaign(campaignId);
  if (!campaign) {
    return [];
  }

  return campaign.targets.map((target) => target.address.toLowerCase());
};

export const getDefaultCriteriaSet = (campaignId: string): string => {
  const campaign = getCampaign(campaignId);
  if (!campaign) {
    throw new Error(`Unknown campaign_id: ${campaignId}`);
  }
  return campaign.criteria_set_id_default;
};

