const templates = {
  'Collaboration': ['Team communication', 'Meetings and collaboration', 'Shared workspaces'],
  'Knowledge & Content': ['Knowledge management', 'Documentation and content', 'Information discovery'],
  'Work Management': ['Work planning', 'Task tracking', 'Workflow visibility'],
  'Analytics & BI': ['Reporting and dashboards', 'Data analysis', 'Business intelligence'],
  'AI & Automation': ['Workflow automation', 'AI assistance', 'Application integration'],
  'Customer & Revenue': ['Customer data', 'Revenue workflows', 'Customer engagement'],
  'Security & IT': ['Access and security', 'IT operations', 'Risk management'],
  'Finance & Operations': ['Financial operations', 'Business operations', 'Process control'],
};

const groups = {
  'Collaboration': 'Slack|Microsoft Teams|Zoom|Google Meet|Webex|Discord|Mattermost|Rocket.Chat|Flock|Chanty|RingCentral|GoTo Meeting|Loom|Miro|Mural|FigJam|Lucidspark|Whimsical|Dropbox|Box|Google Drive|OneDrive|SharePoint|Egnyte|Jitsi Meet',
  'Knowledge & Content': 'Notion|Confluence|Guru|Slite|Coda|Nuclino|Tettra|Document360|Zendesk Guide|Help Scout|Intercom Articles|GitBook|ReadMe|Archbee|Outline|Bloomfire|Adobe Experience Manager|Contentful|Sanity|Storyblok|WordPress|Webflow|Wix|Canva|Figma',
  'Work Management': 'Jira|Asana|Monday.com|ClickUp|Trello|Linear|Wrike|Smartsheet|Basecamp|Teamwork|Hive|Airtable|Microsoft Project|Planview|Rally|Shortcut|YouTrack|Azure DevOps|GitHub Projects|GitLab|Bitbucket|ServiceNow ITSM|Freshservice|BMC Helix|Zoho Projects',
  'Analytics & BI': 'Snowflake|Tableau|Power BI|Looker|ThoughtSpot|Qlik Sense|Mode|Metabase|Sigma Computing|Domo|Sisense|MicroStrategy|Oracle Analytics|SAP Analytics Cloud|IBM Cognos|Amplitude|Mixpanel|Heap|Pendo|FullStory|Hotjar|Google Analytics|Adobe Analytics|Datadog|New Relic',
  'AI & Automation': 'Zapier|Make|Workato|MuleSoft|Boomi|n8n|Tray.io|Pipedream|UiPath|Automation Anywhere|Blue Prism|Microsoft Power Automate|ServiceNow Automation Engine|Copilot Studio|ChatGPT Enterprise|Claude|Gemini for Workspace|Microsoft 365 Copilot|GitHub Copilot|Amazon Bedrock|Google Vertex AI|Azure AI Foundry|LangChain|LlamaIndex|Dataiku',
  'Customer & Revenue': 'Salesforce|HubSpot|Gainsight|Zendesk|Intercom|Freshdesk|Dynamics 365|Pipedrive|Zoho CRM|Close|Copper|Outreach|Salesloft|Apollo|Gong|Clari|ChurnZero|Totango|Catalyst|Medallia|Qualtrics|Braze|Marketo|Pardot|Klaviyo',
  'Security & IT': 'Okta|1Password|LastPass|Dashlane|Keeper|Microsoft Entra ID|Duo|CrowdStrike|SentinelOne|Microsoft Defender|Palo Alto Networks|Zscaler|Cloudflare|Netskope|Tenable|Qualys|Rapid7|Wiz|Snyk|GitGuardian|Tailscale|Jamf|Kandji|ManageEngine|Lansweeper',
  'Finance & Operations': 'Ramp|Brex|Airbase|Navan|Expensify|Concur|Coupa|Zip|Ironclad|DocuSign|Adobe Acrobat Sign|PandaDoc|Workday|ADP|Rippling|Gusto|BambooHR|UKG|Deel|Bill.com|Tipalti|Stripe|QuickBooks|Xero|NetSuite',
};

export const vendorCapabilityCatalogSeed = Object.entries(groups).flatMap(([category, list]) => list.split('|').map(name => ({
  name,
  vendor: name,
  category,
  summary: `General ${category.toLowerCase()} capability profile for ${name}.`,
  capabilities: templates[category],
  primaryJobs: templates[category],
  adjacentCapabilities: [],
  typicalTeams: [],
  confidence: 'Low',
  caveat: 'Curated V0 profile based on general product knowledge. Verify the official product page, edition, and your implementation before relying on it.',
  websiteUrl: '',
}))).slice(0, 200);
