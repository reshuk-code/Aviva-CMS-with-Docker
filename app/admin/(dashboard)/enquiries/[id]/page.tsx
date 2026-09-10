import { notFound } from "next/navigation";

import { EnquiryTriageForm } from "@/components/cms/enquiry-triage-form";
import { PageHeader } from "@/components/cms/page-header";
import { EnquiryStatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { destinations } from "@/lib/cms/repositories/destinations";
import { enquiries } from "@/lib/cms/repositories/enquiries";
import { tours } from "@/lib/cms/repositories/tours";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Enquiry" };

/**
 * Resolves what the enquiry was about, when the form told us.
 *
 * `subjectType`/`subjectId` are a loose reference by design — the form that
 * posted them may be about a tour, a destination, or nothing at all — so a
 * missing record shows as a plain note rather than an error.
 */
async function resolveSubject(
  subjectType: string | null,
  subjectId: string | null,
): Promise<string | null> {
  if (!subjectType || !subjectId) return null;

  if (subjectType === "tour" || subjectType === "tours") {
    const tour = await tours.get(subjectId);
    return tour ? `Tour: ${tour.name}` : "Tour: no longer exists";
  }

  if (subjectType === "destination" || subjectType === "destinations") {
    const destination = await destinations.get(subjectId);
    return destination
      ? `Destination: ${destination.name}`
      : "Destination: no longer exists";
  }

  return `${subjectType}: ${subjectId}`;
}

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("enquiries.read");
  const { id } = await params;

  const enquiry = await enquiries.get(id);
  if (!enquiry) notFound();

  const subject = await resolveSubject(enquiry.subjectType, enquiry.subjectId);
  const canUpdate = hasPermission({ role: session.role }, "enquiries.update");

  const facts: { label: string; value: string | null }[] = [
    { label: "Email", value: enquiry.email },
    { label: "Phone", value: enquiry.phone },
    { label: "Country", value: enquiry.country },
    { label: "Travel date", value: enquiry.travelDate },
    {
      label: "Travellers",
      value: enquiry.travellers ? String(enquiry.travellers) : null,
    },
    { label: "About", value: subject },
    { label: "Source", value: enquiry.source },
    { label: "Received", value: formatDateTime(enquiry.createdAt) },
  ];

  return (
    <>
      <PageHeader
        title={enquiry.name}
        description={`Received ${formatDateTime(enquiry.createdAt)}`}
        breadcrumbs={[
          { label: "Enquiries", href: "/admin/enquiries" },
          { label: enquiry.name },
        ]}
        actions={<EnquiryStatusBadge status={enquiry.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="What they sent"
              description="Exactly as submitted. This is a record, so it is not editable."
            />
            <CardBody>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {enquiry.message}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {facts.map((fact) => (
                  <div key={fact.label} className="space-y-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">
                      {fact.label}
                    </dt>
                    <dd className="text-sm">
                      {fact.label === "Email" && fact.value ? (
                        <a
                          href={`mailto:${fact.value}`}
                          className="text-primary hover:underline"
                        >
                          {fact.value}
                        </a>
                      ) : (
                        (fact.value ?? "—")
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
        </div>

        <EnquiryTriageForm enquiry={enquiry} canUpdate={canUpdate} />
      </div>
    </>
  );
}
