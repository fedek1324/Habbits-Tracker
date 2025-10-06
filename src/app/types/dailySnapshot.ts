export default interface IDailySnapshot {
    date: string, // "YYYY-MM-DD"
    habbits: Array<{
        habbitId: string,
        habbitNeedCount: number,
        habbitDidCount: number
    }>,
    notes: Array<{
        noteId: string,
        noteText: string
    }>
} 