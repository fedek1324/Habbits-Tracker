export default interface IHabbit {
    id: string,
    text: string,
    currentCount: number,
    needCount: number,
    history: Array<{
        date: string, // "YYYY-MM-DD"
        count: number
    }>
}