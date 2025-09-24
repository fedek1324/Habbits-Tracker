import IDailySnapshot from "./dailySnapshot";
import IHabbit from "./habbit";

export default interface IHabbitsData {
    habits: IHabbit[],
    snapshots: IDailySnapshot[]
}

