import { getPlatformDb, currentAppId } from "../db/index.js";
import { notFoundError } from "../errors/index.js";

export async function registerFeatureFlag(params: { key: string; description?: string; isEnabledByDefault?: boolean }) {
  return getPlatformDb().featureFlag.upsert({
    where: { uq_feature_flags_app_key: { appId: currentAppId(), key: params.key } },
    create: { appId: currentAppId(), key: params.key, description: params.description, isEnabledByDefault: params.isEnabledByDefault ?? false },
    update: { description: params.description, isEnabledByDefault: params.isEnabledByDefault ?? false },
  });
}

export async function setFeatureFlagOverride(params: { key: string; organizationId: string; isEnabled: boolean }): Promise<void> {
  const db = getPlatformDb();
  const flag = await db.featureFlag.findUnique({ where: { uq_feature_flags_app_key: { appId: currentAppId(), key: params.key } } });
  if (!flag) throw notFoundError("Feature flag");

  await db.featureFlagOverride.upsert({
    where: { uq_feature_flag_overrides_flag_org: { featureFlagId: flag.id, organizationId: params.organizationId } },
    create: { featureFlagId: flag.id, organizationId: params.organizationId, isEnabled: params.isEnabled },
    update: { isEnabled: params.isEnabled },
  });
}

export async function isFeatureEnabled(key: string, organizationId?: string): Promise<boolean> {
  const db = getPlatformDb();
  const flag = await db.featureFlag.findUnique({ where: { uq_feature_flags_app_key: { appId: currentAppId(), key } } });
  if (!flag) return false;

  if (organizationId) {
    const override = await db.featureFlagOverride.findUnique({
      where: { uq_feature_flag_overrides_flag_org: { featureFlagId: flag.id, organizationId } },
    });
    if (override) return override.isEnabled;
  }

  return flag.isEnabledByDefault;
}

export async function listFeatureFlags() {
  return getPlatformDb().featureFlag.findMany({ where: { appId: currentAppId() }, orderBy: { key: "asc" } });
}
