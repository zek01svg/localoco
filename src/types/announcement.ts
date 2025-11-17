export interface Announcement {
    announcementId: number;
    businessUen: string;
    title: string;
    content: string;
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface UpdatedAnnouncement {
    title: string;
    content: string;
    imageUrl: string;
    updatedAt: string;
}
