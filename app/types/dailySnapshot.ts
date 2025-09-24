export default interface IDailySnapshot {
    date: string, // "YYYY-MM-DD"
    habbits: Array<{
        habbitId: string,
        habbitNeedCount: number,
        habbitDidCount: number
    }>
} 