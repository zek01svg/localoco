export interface Announcement {
    announcementId: number,
    uen: string,
    title: string,
    content: string,
    imageUrl: string,
    createdAt:string,
    updatedAt?:string
}