export type JsonLdProps = {
  /** A schema.org object (or an array of them). `undefined` fields are dropped by JSON.stringify. */
  data: object | object[];
};

/** Escaped "<" so content such as "</script>" can't end the script element. */
const LESS_THAN_ESCAPE = "\\" + "u003c";

/** Serialises structured data into a `<script type="application/ld+json">`. Server component. */
export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, LESS_THAN_ESCAPE) }}
    />
  );
}
