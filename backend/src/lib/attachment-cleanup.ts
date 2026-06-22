import { deleteStoredFiles, extractLegacyAttachmentUrls } from "./file-storage";
import { prisma } from "./prisma";

function collectUrlsFromActivities(
  activities: Array<{ message: string; attachments: Array<{ url: string }> }>,
): string[] {
  return activities.flatMap((activity) => [
    ...activity.attachments.map((attachment) => attachment.url),
    ...extractLegacyAttachmentUrls(activity.message),
  ]);
}

export async function deleteActivityAttachmentFiles(activityId: string): Promise<void> {
  const activity = await prisma.projectActivity.findUnique({
    where: { id: activityId },
    select: {
      message: true,
      attachments: { select: { url: true } },
    },
  });
  if (!activity) {
    return;
  }

  await deleteStoredFiles(collectUrlsFromActivities([activity]));
}

export async function deleteProjectAttachmentFiles(projectId: string): Promise<void> {
  const activities = await prisma.projectActivity.findMany({
    where: { projectId },
    select: {
      message: true,
      attachments: { select: { url: true } },
    },
  });

  await deleteStoredFiles(collectUrlsFromActivities(activities));
}
