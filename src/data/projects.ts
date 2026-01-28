export type Project = {
  slug: string;
  title: string;
  image: string;
  href: string;
  external?: boolean;
  detail?: {
    title: string;
    comingSoon?: boolean;
    primaryLinkLabel?: string;
    primaryLinkUrl?: string;
  };
};

export const projects: Project[] = [
  {
    title: "Project One",
    slug: "project-one",
    image: "/project1.png",
    href: "https://ainews.prajwolsubedi.com.np/#/about",
    external: true,
  },
  {
    title: "Project Two",
    slug: "project-2",
    image: "/project2.png",
    href: "/project-2",
    detail: {
      title: "n8n Workflow Automation",
      comingSoon: true,
      primaryLinkLabel: "Click here to watch the demo video",
      primaryLinkUrl: "https://www.tiktok.com/@just_ask_it/video/7568734573585059080",
    },
  },
  {
    title: "Project Three",
    slug: "project-3",
    image: "/project3.png",
    href: "/project-3",
    detail: {
      title: "Chatbots and Voice Agent using Voiceflow and Retell AI",
      comingSoon: true,
      primaryLinkLabel: "Click here to watch the demo video",
      primaryLinkUrl: "https://www.tiktok.com/@just_ask_it/video/7560704907917921544",
    },
  },
  {
    title: "Project Four",
    slug: "project-4",
    image: "/project4.png",
    href: "/project-4",
    detail: {
      title: "Local Apartment Website",
      comingSoon: true,
      primaryLinkLabel: "Click if you want to see the project demo",
      primaryLinkUrl: "https://www.divinesuitesnepal.com/",
    },
  },
];

export const projectSlugs = projects.filter((p) => !p.external).map((p) => p.slug);

export function getProjectBySlug(slug: string) {
  return projects.find((p) => p.slug === slug);
}
