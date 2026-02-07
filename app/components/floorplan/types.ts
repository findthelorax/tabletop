export type FloorplanListItem = { id: string; name: string };

export type TableOption = { id: string; tableNumber: number; label: string };

export type FloorplanSectionModel = {
    id: string;
    name: string;
    serverId: string | null;
    serverName: string | null;
    tableIds: string[];
};

export type ServerOption = { id: string; name: string };

export type LoaderData = {
    floorplans: FloorplanListItem[];
    selectedFloorplanId: string | null;
    selectedFloorplanName: string | null;
    sections: FloorplanSectionModel[];
    tables: TableOption[];
    servers: ServerOption[];
};
