import { signUpWithPassword } from "@founder-os/platform/auth";
import { createOrganization } from "@founder-os/platform/organizations";
import { startTrialSubscription } from "./billing.js";
import { createCompany } from "./companies-repo.js";

export interface SignUpAndOnboardInput {
  email: string;
  password: string;
  displayName: string;
  organizationName: string;
  organizationSlug: string;
}

export async function signUpAndOnboard(input: SignUpAndOnboardInput, context: { ipAddress?: string; userAgent?: string }) {
  const authResult = await signUpWithPassword(
    { email: input.email, password: input.password, displayName: input.displayName },
    context,
  );

  const organization = await createOrganization({
    creatorUserId: authResult.userId,
    input: { name: input.organizationName, slug: input.organizationSlug },
  });

  await startTrialSubscription(organization.id);

  const company = await createCompany({ organizationId: organization.id, input: { name: input.organizationName } });

  return { userId: authResult.userId, organizationId: organization.id, companyId: company.id, session: authResult.session };
}
