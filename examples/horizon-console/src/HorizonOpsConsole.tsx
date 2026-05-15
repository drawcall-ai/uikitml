import { playfairDisplay } from "@pmndrs/msdfonts/playfair-display";
import { workSans } from "@pmndrs/msdfonts/work-sans";
import { StyleSheet } from "@pmndrs/uikit";
import { Container, Text, setPreferredColorScheme } from "@react-three/uikit";
import { Avatar, Badge, Button, Checkbox, Divider, IconIndicator, InputField, Panel, ProgressBar, ProgressBarStepper, ProgressBarStepperStep, RadioGroup, RadioGroupItem, Slider, Toggle } from "@react-three/uikit-horizon";
import { Activity, Bell, Check, CircleDot, Clock3, Cloud, Cpu, Database, Eye, Gauge, GitBranch, Lock, RadioTower, Route, Search, Server, ShieldCheck, TriangleAlert, Zap } from "@react-three/uikit-lucide";

setPreferredColorScheme("dark");

Object.assign(StyleSheet, {
  dashboard: {
    width: "1180",
    pixelSize: "0.0052",
    flexDirection: "column",
    gap: "18",
    padding: "24",
    backgroundColor: "#07111f",
    borderRadius: "28",
    color: "#f8fafc",
    fontFamily: "work-sans",
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: "14",
  },
  logo: {
    width: "54",
    height: "54",
    borderRadius: "18",
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  "logo-icon": {
    width: "30",
    height: "30",
    color: "white",
  },
  stack: {
    flexDirection: "column",
    gap: "4",
  },
  title: {
    fontSize: "30",
    fontWeight: "bold",
    color: "#ffffff",
    fontFamily: "playfair-display",
  },
  subtitle: {
    fontSize: "14",
    color: "#94a3b8",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: "10",
  },
  body: {
    flexDirection: "row",
    gap: "18",
    flexGrow: "1",
  },
  sidebar: {
    width: "230",
    flexDirection: "column",
    gap: "12",
    padding: "14",
    backgroundColor: "#0b1728",
    borderRadius: "22",
  },
  "nav-item": {
    flexDirection: "row",
    alignItems: "center",
    gap: "10",
    padding: "11",
    borderRadius: "14",
    color: "#cbd5e1",
  },
  "nav-item-active": {
    backgroundColor: "#123a58",
    color: "#ffffff",
  },
  "nav-icon": {
    width: "18",
    height: "18",
    color: "#38bdf8",
  },
  main: {
    flexDirection: "column",
    gap: "18",
    flexGrow: "1",
  },
  metrics: {
    flexDirection: "row",
    gap: "14",
  },
  metric: {
    flexGrow: "1",
    flexDirection: "column",
    gap: "10",
    padding: "16",
    backgroundColor: "#0b1728",
    borderRadius: "20",
    borderWidth: "1",
    borderColor: "#1e3a5f",
  },
  "metric-head": {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  "metric-icon": {
    width: "22",
    height: "22",
    color: "#7dd3fc",
  },
  "metric-value": {
    fontSize: "28",
    fontWeight: "bold",
    color: "#ffffff",
  },
  "metric-label": {
    fontSize: "13",
    color: "#94a3b8",
  },
  grid: {
    flexDirection: "row",
    gap: "18",
    flexGrow: "1",
  },
  "left-col": {
    flexDirection: "column",
    gap: "18",
    flexGrow: "1",
  },
  "right-col": {
    width: "300",
    flexDirection: "column",
    gap: "18",
  },
  card: {
    flexDirection: "column",
    gap: "14",
    padding: "18",
    backgroundColor: "#0b1728",
    borderRadius: "22",
    borderWidth: "1",
    borderColor: "#1f2d44",
  },
  "card-row": {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12",
  },
  "section-title": {
    fontSize: "18",
    fontWeight: "bold",
    color: "#ffffff",
  },
  muted: {
    fontSize: "13",
    color: "#94a3b8",
  },
  timeline: {
    flexDirection: "column",
    gap: "10",
  },
  event: {
    flexDirection: "row",
    gap: "12",
    alignItems: "center",
    padding: "11",
    borderRadius: "14",
    backgroundColor: "#111d30",
  },
  "event-icon": {
    width: "18",
    height: "18",
    color: "#67e8f9",
  },
  "event-copy": {
    flexDirection: "column",
    gap: "2",
    flexGrow: "1",
  },
  "event-title": {
    fontSize: "14",
    fontWeight: "bold",
    color: "#e2e8f0",
  },
  "event-time": {
    fontSize: "12",
    color: "#64748b",
  },
  "system-map": {
    height: "190",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18",
    backgroundColor: "#081524",
    borderRadius: "20",
  },
  node: {
    width: "92",
    height: "92",
    borderRadius: "28",
    backgroundColor: "#0f2740",
    borderWidth: "1",
    borderColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  "node-hot": {
    backgroundColor: "#3b1d31",
    borderColor: "#f43f5e",
    "*": {
      color: "#fb7185",
    },
  },
  "node-icon": {
    width: "34",
    height: "34",
    color: "#93c5fd",
  },
  controls: {
    flexDirection: "column",
    gap: "12",
  },
  "control-line": {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12",
  },
  "field-row": {
    flexDirection: "row",
    alignItems: "center",
    gap: "10",
  },
  "input-shell": {
    flexGrow: "1",
  },
  tiny: {
    fontSize: "12",
    color: "#64748b",
  },
  "status-good": {
    color: "#86efac",
  },
  "status-warn": {
    color: "#fbbf24",
  },
  fill: {
    flexGrow: "1",
  },
});

export function HorizonOpsConsole() {
  return (
    <Panel classList={["dashboard"]} fontFamilies={{ "playfair-display": playfairDisplay, "work-sans": workSans }}>
      <Container classList={["topbar"]}>
        <Container classList={["brand"]}>
          <Container classList={["logo"]}>
            <RadioTower classList={["logo-icon"]} />
          </Container>
          <Container classList={["stack"]}>
            <Container fontSize={32} fontWeight="bold" classList={["title"]}>
              <Text>Horizon Ops Console</Text>
            </Container>
            <Container classList={["subtitle"]}>
              <Text>Northstar fleet telemetry, deployment gates, and live incident posture</Text>
            </Container>
          </Container>
        </Container>
        <Container classList={["actions"]}>
          <Badge label="Live" variant="positive" />
          <Badge label="2 warnings" variant="secondary" />
          <Button size="sm" variant="secondary">
            <Text>Audit Trail</Text>
          </Button>
          <Button size="sm" variant="primary">
            <Text>Deploy</Text>
          </Button>
        </Container>
      </Container>
      <Container classList={["body"]}>
        <Panel classList={["sidebar"]}>
          <Container classList={["nav-item", "nav-item-active"]}>
            <Gauge classList={["nav-icon"]} />
            <Container>
              <Text>Overview</Text>
            </Container>
          </Container>
          <Container classList={["nav-item"]}>
            <Route classList={["nav-icon"]} />
            <Container>
              <Text>Missions</Text>
            </Container>
          </Container>
          <Container classList={["nav-item"]}>
            <Server classList={["nav-icon"]} />
            <Container>
              <Text>Edge Nodes</Text>
            </Container>
          </Container>
          <Container classList={["nav-item"]}>
            <ShieldCheck classList={["nav-icon"]} />
            <Container>
              <Text>Access</Text>
            </Container>
          </Container>
          <Divider orientation="horizontal" />
          <Container classList={["stack"]}>
            <Container classList={["muted"]}>
              <Text>Environment</Text>
            </Container>
            <RadioGroup defaultValue="balanced" classList={["stack"]}>
              <RadioGroupItem value="eco">
                <Text>Eco Scan</Text>
              </RadioGroupItem>
              <RadioGroupItem value="balanced">
                <Text>Balanced</Text>
              </RadioGroupItem>
              <RadioGroupItem value="burst">
                <Text>Burst Mode</Text>
              </RadioGroupItem>
            </RadioGroup>
          </Container>
          <Container classList={["fill"]} />
          <Button size="sm" variant="tertiary">
            <Text>Open Settings</Text>
          </Button>
        </Panel>
        <Container classList={["main"]}>
          <Container classList={["metrics"]}>
            <Panel classList={["metric"]}>
              <Container classList={["metric-head"]}>
                <Activity classList={["metric-icon"]} />
                <Badge label="+12%" variant="positive" />
              </Container>
              <Container classList={["metric-value"]}>
                <Text>98.7%</Text>
              </Container>
              <Container classList={["metric-label"]}>
                <Text>Fleet availability</Text>
              </Container>
            </Panel>
            <Panel classList={["metric"]}>
              <Container classList={["metric-head"]}>
                <Cpu classList={["metric-icon"]} />
                <Badge label="stable" variant="secondary" />
              </Container>
              <Container classList={["metric-value"]}>
                <Text>42 ms</Text>
              </Container>
              <Container classList={["metric-label"]}>
                <Text>Median edge latency</Text>
              </Container>
            </Panel>
            <Panel classList={["metric"]}>
              <Container classList={["metric-head"]}>
                <Database classList={["metric-icon"]} />
                <Badge label="hot" variant="primary" />
              </Container>
              <Container classList={["metric-value"]}>
                <Text>1.8 TB</Text>
              </Container>
              <Container classList={["metric-label"]}>
                <Text>Telemetry buffered</Text>
              </Container>
            </Panel>
            <Panel classList={["metric"]}>
              <Container classList={["metric-head"]}>
                <TriangleAlert classList={["metric-icon"]} />
                <Badge label="2 alerts" variant="negative" />
              </Container>
              <Container classList={["metric-value"]}>
                <Text>7</Text>
              </Container>
              <Container classList={["metric-label"]}>
                <Text>Active escalations</Text>
              </Container>
            </Panel>
          </Container>
          <Container classList={["grid"]}>
            <Container classList={["left-col"]}>
              <Panel classList={["card"]}>
                <Container classList={["card-row"]}>
                  <Container classList={["stack"]}>
                    <Container classList={["section-title"]}>
                      <Text>Regional Signal Mesh</Text>
                    </Container>
                    <Container classList={["muted"]}>
                      <Text>Live routing health across orbital, warehouse, and street-level uplinks</Text>
                    </Container>
                  </Container>
                  <IconIndicator variant="good" />
                </Container>
                <Container classList={["system-map"]}>
                  <Container classList={["node"]}>
                    <Cloud classList={["node-icon"]} />
                  </Container>
                  <Container classList={["node"]}>
                    <GitBranch classList={["node-icon"]} />
                  </Container>
                  <Container classList={["node", "node-hot"]}>
                    <Zap classList={["node-icon"]} />
                  </Container>
                  <Container classList={["node"]}>
                    <Lock classList={["node-icon"]} />
                  </Container>
                </Container>
                <ProgressBar value="0.74" />
              </Panel>
              <Panel classList={["card"]}>
                <Container classList={["card-row"]}>
                  <Container classList={["section-title"]}>
                    <Text>Deployment Readiness</Text>
                  </Container>
                  <Badge label="Gate 3 / 5" variant="primary" />
                </Container>
                <ProgressBarStepper>
                  <ProgressBarStepperStep />
                  <ProgressBarStepperStep />
                  <ProgressBarStepperStep />
                  <ProgressBarStepperStep />
                </ProgressBarStepper>
                <Container classList={["controls"]}>
                  <Container classList={["control-line"]}>
                    <Container classList={["muted"]}>
                      <Text>Traffic canary</Text>
                    </Container>
                    <Slider max="100" min="0" step="1" value="38" />
                  </Container>
                  <Container classList={["control-line"]}>
                    <Container classList={["muted"]}>
                      <Text>Auto rollback</Text>
                    </Container>
                    <Toggle />
                  </Container>
                  <Container classList={["control-line"]}>
                    <Container classList={["muted"]}>
                      <Text>Require operator confirmation</Text>
                    </Container>
                    <Checkbox />
                  </Container>
                </Container>
              </Panel>
            </Container>
            <Container classList={["right-col"]}>
              <Panel classList={["card"]}>
                <Container classList={["card-row"]}>
                  <Container classList={["section-title"]}>
                    <Text>Command Search</Text>
                  </Container>
                  <Search classList={["event-icon"]} />
                </Container>
                <Container classList={["field-row"]}>
                  <InputField placeholder="Jump to node, mission, or alert" classList={["input-shell"]} />
                </Container>
                <Button size="sm" variant="secondary">
                  <Text>Run Diagnostic</Text>
                </Button>
              </Panel>
              <Panel classList={["card", "timeline"]}>
                <Container classList={["card-row"]}>
                  <Container classList={["section-title"]}>
                    <Text>Incident Feed</Text>
                  </Container>
                  <Bell classList={["event-icon"]} />
                </Container>
                <Container classList={["event"]}>
                  <Check classList={["event-icon", "status-good"]} />
                  <Container classList={["event-copy"]}>
                    <Container classList={["event-title"]}>
                      <Text>Canary probe cleared</Text>
                    </Container>
                    <Container classList={["event-time"]}>
                      <Text>18 seconds ago</Text>
                    </Container>
                  </Container>
                </Container>
                <Container classList={["event"]}>
                  <TriangleAlert classList={["event-icon", "status-warn"]} />
                  <Container classList={["event-copy"]}>
                    <Container classList={["event-title"]}>
                      <Text>Battery drift on node E-17</Text>
                    </Container>
                    <Container classList={["event-time"]}>
                      <Text>2 minutes ago</Text>
                    </Container>
                  </Container>
                </Container>
                <Container classList={["event"]}>
                  <Eye classList={["event-icon"]} />
                  <Container classList={["event-copy"]}>
                    <Container classList={["event-title"]}>
                      <Text>Manual review opened</Text>
                    </Container>
                    <Container classList={["event-time"]}>
                      <Text>9 minutes ago</Text>
                    </Container>
                  </Container>
                </Container>
                <Container classList={["event"]}>
                  <Clock3 classList={["event-icon"]} />
                  <Container classList={["event-copy"]}>
                    <Container classList={["event-title"]}>
                      <Text>Batch replay scheduled</Text>
                    </Container>
                    <Container classList={["event-time"]}>
                      <Text>22 minutes ago</Text>
                    </Container>
                  </Container>
                </Container>
              </Panel>
              <Panel classList={["card"]}>
                <Container classList={["card-row"]}>
                  <Container classList={["section-title"]}>
                    <Text>Operators</Text>
                  </Container>
                  <Badge label="4 online" variant="positive" />
                </Container>
                <Container classList={["card-row"]}>
                  <Avatar size="sm" />
                  <Container classList={["muted"]}>
                    <Text>Mira Chen</Text>
                  </Container>
                  <CircleDot classList={["event-icon", "status-good"]} />
                </Container>
                <Container classList={["card-row"]}>
                  <Avatar size="sm" />
                  <Container classList={["muted"]}>
                    <Text>Jon Bell</Text>
                  </Container>
                  <CircleDot classList={["event-icon", "status-good"]} />
                </Container>
                <Container classList={["card-row"]}>
                  <Avatar size="sm" />
                  <Container classList={["muted"]}>
                    <Text>Rae Ito</Text>
                  </Container>
                  <CircleDot classList={["event-icon", "status-warn"]} />
                </Container>
              </Panel>
            </Container>
          </Container>
        </Container>
      </Container>
    </Panel>
  );
}
