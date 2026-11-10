/* The Details and Contact sections: who you are, how to reach you and your links. */
import { CONTACT_FIELDS, DETAIL_FIELDS, LINK_FIELDS } from '../fields.ts';
import { FieldList, Note, Pane, Section, ShowSwitch, SubHeading } from '../ui.tsx';

export function DetailsPane() {
  return (
    <Pane id="details">
      <Section title="Your details" hint="switch on to show">
        <FieldList fields={DETAIL_FIELDS} />
      </Section>
    </Pane>
  );
}

export function ContactPane() {
  return (
    <Pane id="contact">
      <Section title="Contact and links" hint="switch on to show">
        <FieldList fields={CONTACT_FIELDS} />
        <SubHeading>Links</SubHeading>
        <FieldList fields={LINK_FIELDS} />
        <div>
          <ShowSwitch flag="teams" label="Chat on Teams" />
          <Note>Opens a Teams chat with your email address.</Note>
        </div>
      </Section>
    </Pane>
  );
}
