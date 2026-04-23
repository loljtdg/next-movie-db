import { useState, useRef } from "react";
import { Button, Tooltip } from "antd";
import { RedoOutlined } from "@ant-design/icons";
import { TablePane } from "./table-pane";
import { ScanPane } from "./scan-pane";

export function MovieList() {
  const [tableKey, setTableKey] = useState(0);
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="page">
      <div className="main-button-row">
        <Tooltip title="刷新">
          <Button
            icon={<RedoOutlined />}
            onClick={() => setTableKey((pre) => pre + 1)}
          ></Button>
        </Tooltip>
        <div ref={buttonContainerRef} />
        <div style={{ flex: 1 }} />
        <ScanPane />
      </div>
      <TablePane key={tableKey} buttonContainerRef={buttonContainerRef} />
    </div>
  );
}
