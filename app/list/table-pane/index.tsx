import { useEffect, useState } from "react";
import { message } from "antd";
import type { Actor, DatabaseJson, DBTag } from "../../api/db/types";
import { DataType } from "./types";
import { MovieTable } from "./MovieTable";
import axios from "../../lib/axios";

export function TablePane({
  buttonContainerRef,
}: {
  buttonContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [data, setData] = useState<DataType>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getHandleData();
  }, []);

  async function getHandleData() {
    setLoading(true);
    try {
      const dbString = (await axios.get<{ dbString: string }>("/api/db")).data
        .dbString;
      const jsonData: DatabaseJson = JSON.parse(dbString);
      const { movies, actors, tags } = jsonData;
      movies.sort((a, b) => {
        const aDate = a.release_date || a.file_added_date;
        const bDate = b.release_date || b.file_added_date;
        return bDate - aDate;
      });
      movies.forEach((movie) => {
        let coverUrl = movie.cover_url;
        if (coverUrl && !coverUrl.startsWith("http")) {
          movie.cover_url = "/api/image?path=" + encodeURIComponent(coverUrl);
        }
      });

      const actorMap = new Map<string, Actor>();
      actors.forEach((actor) => actorMap.set(actor.id, actor));

      const tagMap = new Map<string, DBTag>();
      tags.forEach((tag) => tagMap.set(tag.id, tag));

      setData({
        movies,
        actorMap,
        tagMap,
      });
    } catch (e) {
      message.error((e as Error).message);
      console.error(e);
    }
    setLoading(false);
  }

  return (
    data && (
      <MovieTable
        data={data}
        loading={loading}
        buttonContainerRef={buttonContainerRef}
      />
    )
  );
}
