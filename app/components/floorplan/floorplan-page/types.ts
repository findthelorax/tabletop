export type FieldErrors = Record<string, string>;

export type ActionFailure = {
    ok: false;
    formError?: string;
    fieldErrors?: FieldErrors;
};

export type ActionSuccess<T extends object = {}> = { ok: true } & T;

export type ActionResult<T extends object = {}> =
    | ActionSuccess<T>
    | ActionFailure;

export type CreateFloorplanResult = ActionResult<{ floorplanId: string }>;
export type RenameFloorplanResult = ActionResult;
export type DeleteFloorplanResult = ActionResult;
export type CreateSectionResult = ActionResult<{ sectionId: string }>;
