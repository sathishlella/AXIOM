import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Row,
  Column,
} from "@react-email/components"

interface Shift {
  weekLabel: string
  shiftName: string
  startTime: string
  location?: string | null
  notes?: string | null
}

interface WeeklyShiftEmailProps {
  employeeName: string
  month: string
  year: number
  shifts: Shift[]
}

export default function WeeklyShiftEmail({
  employeeName,
  month,
  year,
  shifts,
}: WeeklyShiftEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your shift schedule for {month} {String(year)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={title}>AXIOM</Heading>
            <Text style={subtitle}>Workforce Orchestration</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              Hi {employeeName},
            </Heading>
            <Text style={text}>
              Your shift schedule for <strong>{month} {year}</strong> has been published.
              Please review your assignments below:
            </Text>

            {shifts.map((shift, index) => (
              <Section key={index} style={shiftCard}>
                <Row>
                  <Column>
                    <Text style={shiftWeek}>{shift.weekLabel}</Text>
                    <Text style={shiftName}>{shift.shiftName}</Text>
                    <Text style={shiftTime}>Start: {shift.startTime}</Text>
                    {shift.location && (
                      <Text style={shiftNote}>Location: {shift.location}</Text>
                    )}
                    {shift.notes && (
                      <Text style={shiftNote}>Note: {shift.notes}</Text>
                    )}
                  </Column>
                </Row>
              </Section>
            ))}

            <Hr style={divider} />

            <Text style={footerText}>
              If you have any conflicts or need to request a swap, please contact your manager as soon as possible.
            </Text>
            <Text style={footerText}>
              - Taylor&apos;s ICT Service Desk
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "24px",
  maxWidth: "600px",
}

const header = {
  borderBottom: "1px solid #e2e8f0",
  paddingBottom: "16px",
  marginBottom: "24px",
}

const title = {
  color: "#0f172a",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 4px",
  letterSpacing: "-0.5px",
}

const subtitle = {
  color: "#64748b",
  fontSize: "14px",
  margin: "0",
}

const content = {
  padding: "8px 0",
}

const heading = {
  color: "#0f172a",
  fontSize: "20px",
  fontWeight: "600",
  margin: "0 0 16px",
}

const text = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 24px",
}

const shiftCard = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
}

const shiftWeek = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px",
}

const shiftName = {
  color: "#0f172a",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 4px",
}

const shiftTime = {
  color: "#334155",
  fontSize: "14px",
  margin: "0 0 4px",
}

const shiftNote = {
  color: "#94a3b8",
  fontSize: "13px",
  fontStyle: "italic" as const,
  margin: "0",
}

const divider = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
}

const footerText = {
  color: "#64748b",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 8px",
}
