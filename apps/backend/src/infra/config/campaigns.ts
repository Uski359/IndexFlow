export type {
  CampaignConfig,
  CampaignCriteriaSet,
  CampaignDefaultWindow,
  CampaignId,
  CampaignTarget
} from '../../config/campaigns.js';
export { campaignConfigs } from '../../config/campaigns.js';
export {
  getCampaign as getCampaignConfig,
  getCampaignTargets,
  getDefaultCriteriaSet,
  listCampaigns
} from '../../config/campaignRegistry.js';
