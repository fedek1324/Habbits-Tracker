import IDailySnapshot from "./dailySnapshot";
import IHabbit from "./habbit";
import INote from "./note";

export default interface IHabitsAndNotesData {
    habits: IHabbit[],
    notes: INote[],
    snapshots: IDailySnapshot[]
}

